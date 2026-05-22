export class GeminiLiveService {
    constructor(onMessageReceived, onStatusChange) {
        this.apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        this.ws = null;
        this.audioContext = null;
        this.mediaStream = null;
        this.processor = null;
        
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
            
            // Gemini Multimodal Live API endpoint
            const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${this.apiKey}`;
            this.ws = new WebSocket(url);

            this.ws.onopen = () => {
                this.onStatusChange('connected', "Bağlandı");
                // Bağlantı kurulduğunda ilk Setup mesajını gönderiyoruz
                const setupMessage = {
                    setup: {
                        model: "models/gemini-2.0-flash-exp",
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

                this.ws.send(JSON.stringify(setupMessage));
            };

            this.ws.onmessage = async (event) => {
                try {
                    let dataText = event.data;
                    if (event.data instanceof Blob) {
                        dataText = await event.data.text();
                    }
                    const data = JSON.parse(dataText);
                    this.handleServerMessage(data);
                } catch (err) {
                    console.error("Mesaj ayrıştırma hatası:", err);
                }
            };

            this.ws.onerror = (error) => {
                console.error("WebSocket Hatası:", error);
                this.onStatusChange('error', "Sunucuya bağlanırken hata oluştu.");
            };

            this.ws.onclose = () => {
                this.onStatusChange('disconnected', "Bağlantı kesildi.");
                this.stopAudioCapture();
            };

            return true;
        } catch (error) {
            console.error("Bağlantı başlatılamadı:", error);
            this.onStatusChange('error', error.message);
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
        
        // Asistan bir fonksiyon çağırmak isterse
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

        // Eğer kullanıcı araya girerse (interrupt)
        if (data.serverContent && data.serverContent.interrupted) {
            this.stopPlayback();
        }
    }

    async startAudioCapture() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        try {
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Gemini 16000Hz örnekleme hızı bekliyor
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
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
                    id: callId,
                    name: name,
                    response: response
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
        this.stopPlayback();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}
