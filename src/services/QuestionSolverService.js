/**
 * QuestionSolverService - Çoklu Yapay Zeka Hata Toleranslı Soru Çözme ve Web Arama Servisi
 * 
 * Bu servis; YKS/LGS test soruları ve güncel web aramaları için 5 aşamalı model zincirini
 * (Model 1 -> Model 2 -> Model 3 -> Model 4 -> Model 5) yönetir. Herhangi bir modelde 
 * limit aşımı (Rate Limit - 429) veya hata olması durumunda otomatik olarak bir sonraki 
 * modele geçiş (Failover) yapar.
 */

const MODEL_CHAIN = [
    { id: "gemini-2.5-flash", displayName: "Model 1", name: "Gemini 3.5 Flash" },
    { id: "gemini-2.5-flash-lite", displayName: "Model 2", name: "Gemini 3.1 Flash Lite" },
    { id: "gemini-2.5-flash", displayName: "Model 3", name: "Gemini 3 Flash" },
    { id: "gemini-1.5-flash", displayName: "Model 4", name: "Gemini 2.5 Flash" },
    { id: "gemini-1.5-flash-8b", displayName: "Model 5", name: "Gemini 2.5 Flash Lite" }
];

export class QuestionSolverService {
    constructor() {
        this.apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    }

    /**
     * Zincirleme yapay zeka modelleriyle hata toleranslı içerik üretir/soru çözer.
     * 
     * @param {string} prompt Kullanıcının sorusu veya arama metni.
     * @param {string|null} imageBase64 O anki ekranın base64 formatındaki görüntüsü (JPEG).
     * @param {boolean} needsWebSearch Google Arama (Google Search Grounding) aktif olsun mu?
     * @param {function} onModelChange Model değişikliklerini (failover) arayüze bildiren callback.
     * @returns {Promise<{text: string, model: string}>} Başarılı olan modelin çözümü ve adı.
     */
    async solveWithFallback(prompt, imageBase64 = null, needsWebSearch = false, onModelChange = null) {
        if (!this.apiKey || this.apiKey === 'BURAYA_API_KEY_GELECEK') {
            throw new Error("Gemini API Anahtarı bulunamadı veya geçersiz!");
        }

        // Zinciri sırayla dene
        for (let i = 0; i < MODEL_CHAIN.length; i++) {
            const model = MODEL_CHAIN[i];
            
            try {
                // Arayüze aktif çalışan modeli bildir
                if (onModelChange) {
                    onModelChange(model.displayName, `Model ${i + 1} ile çözülüyor...`, false);
                }

                console.log(`🤖 [QuestionSolver] Model deneniyor: ${model.displayName} (${model.id})`);
                
                const responseText = await this.callGeminiAPI(model.id, prompt, imageBase64, needsWebSearch);
                
                // Başarılı olursa sonucu dön
                return {
                    text: responseText,
                    model: model.displayName
                };

            } catch (error) {
                console.warn(`⚠️ [QuestionSolver] ${model.displayName} başarısız oldu! Hata:`, error.message);
                
                // Eğer zincirde başka model varsa bir sonrakine geç
                if (i < MODEL_CHAIN.length - 1) {
                    const nextModel = MODEL_CHAIN[i + 1];
                    if (onModelChange) {
                        onModelChange(
                            model.displayName, 
                            `${model.displayName} limiti doldu. ${nextModel.displayName}'e geçiliyor...`, 
                            true
                        );
                    }
                    // Milisaniyelik ufak bir es payı verip bir sonraki modele geç
                    await new Promise(resolve => setTimeout(resolve, 500));
                } else {
                    // Son model de başarısız olduysa hata fırlat (canlı asistan fallback tetiklenecek)
                    throw new Error("Tüm gelişmiş yapay zeka modelleri limit aşımına uğradı veya ulaşılamaz durumda!");
                }
            }
        }
    }

    /**
     * Belirli bir Gemini modelini REST API üzerinden doğrudan çağırır.
     */
    async callGeminiAPI(modelId, prompt, imageBase64, needsWebSearch) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${this.apiKey}`;
        
        // İstek parçalarını hazırla
        const parts = [];

        // 1. Yazılı Prompt (Soru metni veya yönerge)
        // YKS/LGS için çözümü daha şık, anlaşılır ve adım adım yapmasını zorlayalım.
        const systemInstruction = `Sen akıllı bir eğitim asistanısın. YKS, LGS veya okul dersleriyle ilgili soruları en doğru, kısa, net ve anlaşılır biçimde çöz. Adım adım açıkla ancak laf kalabalığı yapma.`;
        parts.push({ text: `${systemInstruction}\n\nSoru:\n${prompt}` });

        // 2. Görsel snapshot (Varsa çoklu mod desteği)
        if (imageBase64) {
            // Base64 başlığını temizle (örn: data:image/jpeg;base64,...)
            const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
            parts.push({
                inlineData: {
                    mimeType: "image/jpeg",
                    data: cleanBase64
                }
            });
        }

        const requestBody = {
            contents: [
                {
                    parts: parts
                }
            ]
        };

        // Eğer güncel web araması gerekiyorsa Google Search Grounding ekle
        if (needsWebSearch) {
            requestBody.tools = [
                {
                    googleSearch: {}
                }
            ];
        }

        // İstek gönder
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            const errMsg = errData.error?.message || `HTTP Hata: ${response.status}`;
            throw new Error(errMsg);
        }

        const data = await response.json();
        
        // Yanıtı doğrula ve çıkar
        const candidate = data.candidates?.[0];
        if (!candidate || !candidate.content?.parts?.[0]?.text) {
            throw new Error("Modelden geçerli bir yanıt alınamadı!");
        }

        let solutionText = candidate.content.parts[0].text;

        // Eğer Google Search Grounding kullanıldıysa ve kaynaklar varsa sonuna ekle
        if (needsWebSearch && candidate.groundingMetadata?.groundingChunks) {
            solutionText += "\n\n🌐 **Kaynaklar:**\n";
            const chunks = candidate.groundingMetadata.groundingChunks;
            const addedUrls = new Set();
            chunks.forEach(chunk => {
                if (chunk.web?.uri && chunk.web?.title) {
                    const cleanUrl = chunk.web.uri;
                    if (!addedUrls.has(cleanUrl)) {
                        addedUrls.add(cleanUrl);
                        solutionText += `- [${chunk.web.title}](${cleanUrl})\n`;
                    }
                }
            });
        }

        return solutionText;
    }
}
