export class GeminiLiveService {
    constructor(onMessageReceived, onStatusChange) {
        this.apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        this.ws = null;
        this.audioContext = null;
        this.mediaStream = null;
        this.processor = null;
        this.videoStream = null;
        this.videoInterval = null;
        
        // Ses çalma işlemleri için
        this.playbackContext = null;
        this.nextPlayTime = 0;

        this.onMessageReceived = onMessageReceived;
        this.onStatusChange = onStatusChange;
        this.onFunctionCall = null;
    }

    async connect(systemInstruction = "Sen akıllı bir eğitim asistanısın.", tools = []) {
        if (!this.apiKey || this.apiKey === 'BURAYA_API_KEY_GELECEK') {
            console.error("Gemini API Key bulunamadı!");
            this.onStatusChange('error', "API Anahtarı eksik veya geçersiz. Lütfen .env dosyanızı kontrol edin.");
            return false;
        }

        try {
            this.onStatusChange('connecting', "Bağlanıyor...");
            
            // 1. Dinamik Model Bulma (Kullanıcının API Key'ine özel hangi Live modellerin açık olduğunu buluruz)
            let selectedModel = "models/gemini-2.0-flash-exp"; // Yedek varsayılan
            try {
                const modelResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`);
                const modelData = await modelResp.json();
                if (modelData && modelData.models) {
                    const liveModels = modelData.models.filter(m => 
                        m.supportedGenerationMethods && m.supportedGenerationMethods.includes('bidiGenerateContent')
                    );
                    if (liveModels.length > 0) {
                        // İlk desteklenen Live modelini otomatik seç
                        selectedModel = liveModels[0].name;
                        console.log("🎙️ Desteklenen Canlı Ses Modeli Bulundu:", selectedModel);
                    } else {
                        console.warn("⚠️ API Key'inize tanımlı bir BidiGenerateContent (Canlı Ses) modeli bulunamadı.");
                    }
                }
            } catch (e) {
                console.warn("Modeller kontrol edilemedi, varsayılan denenecek:", e);
            }

            // Gemini Multimodal Live API endpoint (v1beta veya v1alpha ikisi de çalışır, v1alpha daha güncel önizlemeler için)
            const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${this.apiKey}`;
            
            return new Promise((resolve) => {
                this.ws = new WebSocket(url);

                this.ws.onopen = () => {
                    this.onStatusChange('connected', "Bağlandı");
                    // Bağlantı kurulduğunda ilk Setup mesajını gönderiyoruz
                    const setupMessage = {
                        setup: {
                            // Dinamik olarak bulduğumuz modeli atıyoruz
                            model: selectedModel,
                            generationConfig: {
                                responseModalities: ["AUDIO"]
                            },
                            systemInstruction: {
                                parts: [{ text: systemInstruction }]
                            }
                        }
                    };
                    
                    if (tools && tools.length > 0) {
                        setupMessage.setup.tools = [{ functionDeclarations: tools }];
                    }

                    console.log("📤 Setup Gönderiliyor:", setupMessage);
                    this.ws.send(JSON.stringify(setupMessage));
                    resolve(true); // Bağlantı başarılı olunca true dön
                };

                this.ws.onmessage = async (event) => {
                    try {
                        let dataText = event.data;
                        if (dataText instanceof Blob) {
                            dataText = await dataText.text();
                        }
                        const data = JSON.parse(dataText);
                        console.log("📥 Sunucudan Gelen Mesaj:", data);
                        
                        if (data.setupComplete) {
                            this.onStatusChange('listening', "Sizi dinliyor...");
                            return;
                        }
                        this.handleServerMessage(data);
                    } catch (err) {
                        console.error("Mesaj ayrıştırma hatası:", err);
                    }
                };

                this.ws.onerror = (error) => {
                    console.error("❌ WebSocket Hatası:", error);
                    this.onStatusChange('error', "Sunucuya bağlanırken hata oluştu.");
                    resolve(false);
                };

                this.ws.onclose = (event) => {
                    console.log("🛑 WebSocket kapandı. Kod:", event.code, "Sebep:", event.reason);
                    
                    // Eğer hata kodu 1000 değilse, sebebi ekrana yansıt
                    let errorMsg = "Bağlantı kesildi.";
                    if (event.code !== 1000 && event.code !== 1005) {
                         errorMsg = `Bağlantı kesildi (Kod: ${event.code}). Neden: ${event.reason || "Bilinmiyor/Geçersiz Model"}`;
                    }
                    
                    this.onStatusChange('disconnected', errorMsg);
                    this.stopAudioCapture();
                    resolve(false);
                };
            });
        } catch (error) {
            console.error("Beklenmeyen hata:", error);
            this.onStatusChange('error', "Beklenmeyen bir hata oluştu.");
            return false;
        }
    }

    handleServerMessage(data) {
        // Asistanın cevabında ses parçaları varsa çal
        if (data.serverContent && data.serverContent.modelTurn) {
            const parts = data.serverContent.modelTurn.parts;
            for (const part of parts) {
                if (part.inlineData && part.inlineData.data) {
                    // Gelen ses genelde 24000Hz PCM formatındadır
                    this.playPcmAudio(part.inlineData.data, 24000); 
                }
                if (part.text) {
                    this.onMessageReceived('text', part.text);
                }
            }
        }
        
        // Asistan bir fonksiyon çağırmak isterse (Standart modelTurn altındaki functionCall)
        if (data.serverContent && data.serverContent.modelTurn) {
            const parts = data.serverContent.modelTurn.parts;
            for (const part of parts) {
                if (part.functionCall) {
                    if (this.onFunctionCall) {
                        this.onFunctionCall(part.functionCall);
                    }
                }
            }
        }

        // Gemini Multimodal Live API root toolCall desteği
        if (data.toolCall && data.toolCall.functionCalls) {
            for (const call of data.toolCall.functionCalls) {
                if (this.onFunctionCall) {
                    this.onFunctionCall(call);
                }
            }
        }

        // Eğer kullanıcı araya girerse (interrupt)
        if (data.serverContent && data.serverContent.interrupted) {
            this.stopPlayback();
        }
    }

    async startAudioCapture() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn("WebSocket hazır değil, ses yakalama başlatılamadı.");
            return;
        }

        try {
            console.log("🎤 Mikrofon izni isteniyor...");
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 16000
                } 
            });
            console.log("✅ Mikrofon izni alındı.");
            
            // Gemini 16000Hz örnekleme hızı bekliyor
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            const source = this.audioContext.createMediaStreamSource(this.mediaStream);
            
            // Basit ve geniş uyumlu bir mikrofon yakalayıcı (ScriptProcessor)
            this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
            
            this.processor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                this.sendPcmData(inputData);
            };

            source.connect(this.processor);
            this.processor.connect(this.audioContext.destination);
            
            this.onStatusChange('listening', "Sizi dinliyor...");

        } catch (error) {
            console.error("Mikrofon hatası:", error);
            this.onStatusChange('error', "Mikrofon erişimi reddedildi.");
        }
    }

    sendPcmData(float32Array) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        
        // Float32 (tarayıcı formatı) -> Int16 (Gemini formatı) dönüşümü
        const int16Array = new Int16Array(float32Array.length);
        for (let i = 0; i < float32Array.length; i++) {
            let s = Math.max(-1, Math.min(1, float32Array[i]));
            int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Int16Array -> Base64 dönüşümü
        const uint8Array = new Uint8Array(int16Array.buffer);
        let binary = '';
        for (let i = 0; i < uint8Array.byteLength; i++) {
            binary += String.fromCharCode(uint8Array[i]);
        }
        const base64Pcm = window.btoa(binary);

        const msg = {
            realtimeInput: {
                mediaChunks: [{
                    mimeType: "audio/pcm;rate=16000",
                    data: base64Pcm
                }]
            }
        };
        
        this.ws.send(JSON.stringify(msg));
    }

    sendFunctionResponse(callId, name, response) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        const msg = {
            toolResponse: {
                functionResponses: [{
                    id: callId || `fc_${Date.now()}`,
                    name: name,
                    response: {
                        result: response
                    }
                }]
            }
        };
        this.ws.send(JSON.stringify(msg));
    }

    sendTextMessage(text) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        const msg = {
            clientContent: {
                turns: [{
                    role: "user",
                    parts: [{ text: text }]
                }],
                turnComplete: true
            }
        };
        this.ws.send(JSON.stringify(msg));
    }

    async playPcmAudio(base64Data, sampleRate) {
        if (!this.playbackContext || this.playbackContext.state === 'closed') {
            this.playbackContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate });
            this.nextPlayTime = this.playbackContext.currentTime;
        }

        // Base64 Decode
        const binary = window.atob(base64Data);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        
        // Int16 -> Float32 dönüşümü
        const int16Array = new Int16Array(bytes.buffer);
        const float32Array = new Float32Array(int16Array.length);
        for (let i = 0; i < int16Array.length; i++) {
            float32Array[i] = int16Array[i] / 0x8000;
        }

        const audioBuffer = this.playbackContext.createBuffer(1, float32Array.length, sampleRate);
        audioBuffer.getChannelData(0).set(float32Array);

        const source = this.playbackContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.playbackContext.destination);

        // Parçaları ardışık olarak kesintisiz çal
        if (this.nextPlayTime < this.playbackContext.currentTime) {
            this.nextPlayTime = this.playbackContext.currentTime;
        }
        source.start(this.nextPlayTime);
        this.nextPlayTime += audioBuffer.duration;
    }

    async startCameraCapture(videoElement) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn("WebSocket hazır değil, kamera yakalama başlatılamadı.");
            return false;
        }

        try {
            console.log("📷 Kamera izni isteniyor...");
            this.videoStream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "environment" } 
            });
            console.log("✅ Kamera izni alındı.");
            
            if (videoElement) {
                videoElement.srcObject = this.videoStream;
            }

            // Kare yakalamak için canvas oluştur
            this.videoCanvas = document.createElement('canvas');
            this.videoCanvas.width = 640;
            this.videoCanvas.height = 480;
            this.videoCtx = this.videoCanvas.getContext('2d');

            // Saniyede 1 kare (1 fps) gönder
            this.videoInterval = setInterval(() => {
                this.sendVideoFrame(videoElement);
            }, 1000);

            return true;
        } catch (error) {
            console.error("Kamera hatası:", error);
            this.onStatusChange('error', "Kamera erişimi reddedildi.");
            return false;
        }
    }

    sendVideoFrame(videoElement) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.videoCtx || !videoElement) return;

        // Video boyutlarını kontrol edip canvas'ı güncelle
        if (videoElement.videoWidth && videoElement.videoHeight) {
            if (this.videoCanvas.width !== videoElement.videoWidth) {
                this.videoCanvas.width = videoElement.videoWidth;
                this.videoCanvas.height = videoElement.videoHeight;
            }
            this.videoCtx.drawImage(videoElement, 0, 0, this.videoCanvas.width, this.videoCanvas.height);
            
            // Base64 JPEG oluştur
            const dataUrl = this.videoCanvas.toDataURL('image/jpeg', 0.6);
            const base64Jpeg = dataUrl.split(',')[1];

            const msg = {
                realtimeInput: {
                    mediaChunks: [{
                        mimeType: "image/jpeg",
                        data: base64Jpeg
                    }]
                }
            };
            
            this.ws.send(JSON.stringify(msg));
        }
    }

    stopCameraCapture() {
        if (this.videoInterval) {
            clearInterval(this.videoInterval);
            this.videoInterval = null;
        }
        if (this.videoStream) {
            this.videoStream.getTracks().forEach(track => track.stop());
            this.videoStream = null;
        }
    }

    stopPlayback() {
        if (this.playbackContext) {
            this.playbackContext.close();
            this.playbackContext = null;
        }
    }

    stopAudioCapture() {
        if (this.processor) {
            this.processor.disconnect();
            this.processor = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
    }

    disconnect() {
        this.stopAudioCapture();
        this.stopCameraCapture();
        this.stopPlayback();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}
