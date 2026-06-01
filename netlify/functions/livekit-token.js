const { AccessToken } = require('livekit-server-sdk');

exports.handler = async (event, context) => {
    // Sadece POST ve GET (test) izin verelim
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            body: ''
        };
    }

    try {
        const body = event.body ? JSON.parse(event.body) : {};
        const roomName = body.roomName || event.queryStringParameters?.roomName;
        const participantName = body.participantName || event.queryStringParameters?.participantName;
        const isTeacher = body.isTeacher || event.queryStringParameters?.isTeacher === 'true';
        
        if (!roomName || !participantName) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'roomName and participantName are required' })
            };
        }

        const apiKey = process.env.LIVEKIT_API_KEY;
        const apiSecret = process.env.LIVEKIT_API_SECRET;

        if (!apiKey || !apiSecret) {
            console.error("LiveKit API Key veya Secret eksik.");
            return {
                statusCode: 500,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'LiveKit credentials are not configured on the server' })
            };
        }

        const at = new AccessToken(apiKey, apiSecret, {
            identity: participantName + '_' + Math.random().toString(36).substring(2, 8),
            name: participantName,
        });

        at.addGrant({ 
            roomJoin: true, 
            room: roomName, 
            canPublish: true, 
            canSubscribe: true,
            // Sadece öğretmen odayı yönetebilir
            roomAdmin: isTeacher 
        });

        const token = await at.toJwt();

        return {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ token })
        };
    } catch (error) {
        console.error("LiveKit token generation error:", error);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: error.message })
        };
    }
};
