const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configuration Roblox
const ROBLOX_API_KEY = process.env.ROBLOX_API_KEY; // À configurer dans Render
const GAME_UNIVERSE_ID = process.env.GAME_UNIVERSE_ID; // À configurer dans Render

// Store pour les connexions actives avec les serveurs Roblox
const activeServers = new Map();

// Endpoint pour que les serveurs Roblox s'enregistrent
app.post('/api/server/register', (req, res) => {
    const { serverId, jobId, placeId, timestamp } = req.body;
    
    activeServers.set(serverId, {
        jobId,
        placeId,
        timestamp,
        lastPing: Date.now()
    });
    
    res.json({ success: true, message: 'Server registered' });
});

// Endpoint pour que les serveurs Roblox envoient un heartbeat
app.post('/api/server/heartbeat', (req, res) => {
    const { serverId } = req.body;
    
    if (activeServers.has(serverId)) {
        const server = activeServers.get(serverId);
        server.lastPing = Date.now();
        activeServers.set(serverId, server);
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false, message: 'Server not found' });
    }
});

// Endpoint pour récupérer les serveurs actifs
app.get('/api/servers', (req, res) => {
    // Nettoyer les serveurs inactifs (plus de 2 minutes sans heartbeat)
    const now = Date.now();
    for (const [serverId, server] of activeServers.entries()) {
        if (now - server.lastPing > 120000) {
            activeServers.delete(serverId);
        }
    }
    
    res.json({
        success: true,
        servers: Array.from(activeServers.entries()).map(([id, data]) => ({
            serverId: id,
            ...data
        }))
    });
});

// ==================== MODERATION ENDPOINTS ====================

// Ban player
app.post('/api/moderation/ban', async (req, res) => {
    const { username, reason, modreason, duration, moderator, apiKey } = req.body;
    
    // Vérifier l'API key
    if (apiKey !== process.env.API_SECRET_KEY) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    try {
        // Envoyer la commande à tous les serveurs actifs
        const command = {
            action: 'ban',
            username,
            reason,
            modreason,
            duration,
            moderator
        };
        
        // Broadcast à tous les serveurs
        const results = await broadcastToServers(command);
        
        res.json({ 
            success: true, 
            message: `Ban command sent to ${results.length} server(s)`,
            results 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Unban player
app.post('/api/moderation/unban', async (req, res) => {
    const { username, reason, modreason, moderator, apiKey } = req.body;
    
    if (apiKey !== process.env.API_SECRET_KEY) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    try {
        const command = {
            action: 'unban',
            username,
            reason,
            modreason,
            moderator
        };
        
        const results = await broadcastToServers(command);
        
        res.json({ 
            success: true, 
            message: `Unban command sent to ${results.length} server(s)`,
            results 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Kick player
app.post('/api/moderation/kick', async (req, res) => {
    const { username, reason, modreason, moderator, apiKey } = req.body;
    
    if (apiKey !== process.env.API_SECRET_KEY) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    try {
        const command = {
            action: 'kick',
            username,
            reason,
            modreason,
            moderator
        };
        
        const results = await broadcastToServers(command);
        
        res.json({ 
            success: true, 
            message: `Kick command sent to ${results.length} server(s)`,
            results 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Warn player
app.post('/api/moderation/warn', async (req, res) => {
    const { username, reason, modreason, moderator, apiKey } = req.body;
    
    if (apiKey !== process.env.API_SECRET_KEY) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    try {
        const command = {
            action: 'warn',
            username,
            reason,
            modreason,
            moderator
        };
        
        const results = await broadcastToServers(command);
        
        res.json({ 
            success: true, 
            message: `Warn command sent to ${results.length} server(s)`,
            results 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Unwarn player
app.post('/api/moderation/unwarn', async (req, res) => {
    const { username, sanctionId, moderator, apiKey } = req.body;
    
    if (apiKey !== process.env.API_SECRET_KEY) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    try {
        const command = {
            action: 'unwarn',
            username,
            sanctionId,
            moderator
        };
        
        const results = await broadcastToServers(command);
        
        res.json({ 
            success: true, 
            message: `Unwarn command sent to ${results.length} server(s)`,
            results 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Note player
app.post('/api/moderation/note', async (req, res) => {
    const { username, reason, modreason, moderator, apiKey } = req.body;
    
    if (apiKey !== process.env.API_SECRET_KEY) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    try {
        const command = {
            action: 'note',
            username,
            reason,
            modreason,
            moderator
        };
        
        const results = await broadcastToServers(command);
        
        res.json({ 
            success: true, 
            message: `Note command sent to ${results.length} server(s)`,
            results 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Unnote player
app.post('/api/moderation/unnote', async (req, res) => {
    const { username, sanctionId, moderator, apiKey } = req.body;
    
    if (apiKey !== process.env.API_SECRET_KEY) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    try {
        const command = {
            action: 'unnote',
            username,
            sanctionId,
            moderator
        };
        
        const results = await broadcastToServers(command);
        
        res.json({ 
            success: true, 
            message: `Unnote command sent to ${results.length} server(s)`,
            results 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get player history
app.post('/api/moderation/history', async (req, res) => {
    const { username, apiKey } = req.body;
    
    if (apiKey !== process.env.API_SECRET_KEY) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    try {
        const command = {
            action: 'getHistory',
            username
        };
        
        // On ne prend que le premier serveur actif pour récupérer l'historique
        const servers = Array.from(activeServers.keys());
        if (servers.length === 0) {
            return res.status(503).json({ success: false, message: 'No active servers' });
        }
        
        // Stocker la requête pour que le serveur Roblox la récupère
        pendingRequests.set(`history_${username}`, {
            command,
            timestamp: Date.now(),
            resolved: false
        });
        
        res.json({ 
            success: true, 
            message: 'History request sent',
            requestId: `history_${username}`
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==================== PLAYER ACTIONS ====================

// Bring player
app.post('/api/player/bring', async (req, res) => {
    const { targetPlayer, moderator, apiKey } = req.body;
    
    if (apiKey !== process.env.API_SECRET_KEY) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    try {
        const command = {
            action: 'bring',
            targetPlayer,
            moderator
        };
        
        const results = await broadcastToServers(command);
        
        res.json({ 
            success: true, 
            message: `Bring command sent to ${results.length} server(s)`,
            results 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Freeze player
app.post('/api/player/freeze', async (req, res) => {
    const { targetPlayer, apiKey } = req.body;
    
    if (apiKey !== process.env.API_SECRET_KEY) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    try {
        const command = {
            action: 'freeze',
            targetPlayer
        };
        
        const results = await broadcastToServers(command);
        
        res.json({ 
            success: true, 
            message: `Freeze command sent to ${results.length} server(s)`,
            results 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// God mode
app.post('/api/player/god', async (req, res) => {
    const { targetPlayer, apiKey } = req.body;
    
    if (apiKey !== process.env.API_SECRET_KEY) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    try {
        const command = {
            action: 'god',
            targetPlayer
        };
        
        const results = await broadcastToServers(command);
        
        res.json({ 
            success: true, 
            message: `God mode command sent to ${results.length} server(s)`,
            results 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Goto player
app.post('/api/player/goto', async (req, res) => {
    const { targetPlayer, moderator, apiKey } = req.body;
    
    if (apiKey !== process.env.API_SECRET_KEY) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    try {
        const command = {
            action: 'goto',
            targetPlayer,
            moderator
        };
        
        const results = await broadcastToServers(command);
        
        res.json({ 
            success: true, 
            message: `Goto command sent to ${results.length} server(s)`,
            results 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Heal player
app.post('/api/player/heal', async (req, res) => {
    const { targetPlayer, apiKey } = req.body;
    
    if (apiKey !== process.env.API_SECRET_KEY) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    try {
        const command = {
            action: 'heal',
            targetPlayer
        };
        
        const results = await broadcastToServers(command);
        
        res.json({ 
            success: true, 
            message: `Heal command sent to ${results.length} server(s)`,
            results 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Jail player
app.post('/api/player/jail', async (req, res) => {
    const { targetPlayer, apiKey } = req.body;
    
    if (apiKey !== process.env.API_SECRET_KEY) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    try {
        const command = {
            action: 'jail',
            targetPlayer
        };
        
        const results = await broadcastToServers(command);
        
        res.json({ 
            success: true, 
            message: `Jail command sent to ${results.length} server(s)`,
            results 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Kill player
app.post('/api/player/kill', async (req, res) => {
    const { targetPlayer, apiKey } = req.body;
    
    if (apiKey !== process.env.API_SECRET_KEY) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    try {
        const command = {
            action: 'kill',
            targetPlayer
        };
        
        const results = await broadcastToServers(command);
        
        res.json({ 
            success: true, 
            message: `Kill command sent to ${results.length} server(s)`,
            results 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Send message to player
app.post('/api/player/message', async (req, res) => {
    const { targetPlayer, message, moderator, apiKey } = req.body;
    
    if (apiKey !== process.env.API_SECRET_KEY) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    try {
        const command = {
            action: 'message',
            targetPlayer,
            message,
            moderator
        };
        
        const results = await broadcastToServers(command);
        
        res.json({ 
            success: true, 
            message: `Message command sent to ${results.length} server(s)`,
            results 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Refresh player
app.post('/api/player/refresh', async (req, res) => {
    const { targetPlayer, apiKey } = req.body;
    
    if (apiKey !== process.env.API_SECRET_KEY) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    try {
        const command = {
            action: 'refresh',
            targetPlayer
        };
        
        const results = await broadcastToServers(command);
        
        res.json({ 
            success: true, 
            message: `Refresh command sent to ${results.length} server(s)`,
            results 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Respawn player
app.post('/api/player/respawn', async (req, res) => {
    const { targetPlayer, apiKey } = req.body;
    
    if (apiKey !== process.env.API_SECRET_KEY) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    try {
        const command = {
            action: 'respawn',
            targetPlayer
        };
        
        const results = await broadcastToServers(command);
        
        res.json({ 
            success: true, 
            message: `Respawn command sent to ${results.length} server(s)`,
            results 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get player inventory
app.post('/api/player/inventory', async (req, res) => {
    const { targetPlayer, apiKey } = req.body;
    
    if (apiKey !== process.env.API_SECRET_KEY) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    try {
        const command = {
            action: 'getInventory',
            targetPlayer
        };
        
        pendingRequests.set(`inventory_${targetPlayer}`, {
            command,
            timestamp: Date.now(),
            resolved: false
        });
        
        res.json({ 
            success: true, 
            message: 'Inventory request sent',
            requestId: `inventory_${targetPlayer}`
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==================== COMMAND POLLING SYSTEM ====================

const pendingCommands = [];
const pendingRequests = new Map();

// Les serveurs Roblox appellent cet endpoint régulièrement pour récupérer les commandes
app.get('/api/commands/poll', (req, res) => {
    const { serverId } = req.query;
    
    if (!serverId || !activeServers.has(serverId)) {
        return res.status(400).json({ success: false, message: 'Invalid server ID' });
    }
    
    // Récupérer toutes les commandes en attente
    const commands = [...pendingCommands];
    pendingCommands.length = 0; // Vider la file
    
    // Ajouter les requêtes en attente
    const requests = [];
    for (const [id, request] of pendingRequests.entries()) {
        if (!request.resolved) {
            requests.push({ id, ...request.command });
        }
    }
    
    res.json({
        success: true,
        commands,
        requests
    });
});

// Endpoint pour que les serveurs Roblox renvoient les résultats
app.post('/api/commands/result', (req, res) => {
    const { requestId, result } = req.body;
    
    if (pendingRequests.has(requestId)) {
        const request = pendingRequests.get(requestId);
        request.result = result;
        request.resolved = true;
        pendingRequests.set(requestId, request);
    }
    
    res.json({ success: true });
});

// Endpoint pour récupérer le résultat d'une requête
app.get('/api/commands/result/:requestId', (req, res) => {
    const { requestId } = req.params;
    
    if (!pendingRequests.has(requestId)) {
        return res.status(404).json({ success: false, message: 'Request not found' });
    }
    
    const request = pendingRequests.get(requestId);
    
    if (!request.resolved) {
        return res.json({ success: false, message: 'Request pending', pending: true });
    }
    
    res.json({ success: true, result: request.result });
    
    // Nettoyer après récupération
    setTimeout(() => {
        pendingRequests.delete(requestId);
    }, 60000); // Garder pendant 1 minute
});

// Helper function pour broadcast aux serveurs
async function broadcastToServers(command) {
    pendingCommands.push({
        ...command,
        timestamp: Date.now(),
        id: Date.now() + Math.random()
    });
    
    return [{ success: true, message: 'Command queued for all servers' }];
}

// Nettoyer les vieilles requêtes toutes les 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [id, request] of pendingRequests.entries()) {
        if (now - request.timestamp > 300000) { // 5 minutes
            pendingRequests.delete(id);
        }
    }
}, 300000);

// Page d'accueil
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
});
