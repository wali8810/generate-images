import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from "@google/genai";
import { GoogleGenerativeAI } from "@google/generative-ai"; // Keep stable SDK for fallback if needed
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from './db.js';

const app = express();
const PORT = process.env.PORT || 5001;

// Configuração para servir o frontend
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Middleware para remover o aviso do Ngrok
app.use((req, res, next) => {
  res.setHeader('ngrok-skip-browser-warning', 'true');
  next();
});

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("❌ Erro: GEMINI_API_KEY não encontrada no arquivo .env");
}

// Initialize Experimental SDK (for gemini-3-pro-image-preview)
const ai = new GoogleGenAI({ apiKey: apiKey || "dummy_key" });

// Initialize Stable SDK (for standard text/code generation fallback)
const genAI = new GoogleGenerativeAI(apiKey || "dummy_key");

// Helper: Check and Reset Daily Credits
const checkDailyReset = async (db, user) => {
  // Create mutable copy to avoid "Assignment to constant variable" error
  const updatedUser = { ...user };

  if (updatedUser.plan_type === 'daily') {
    const today = new Date().toISOString().split('T')[0];
    if (updatedUser.last_daily_reset !== today) {
      await db.run('UPDATE users SET credits = 10, last_daily_reset = ? WHERE id = ?', [today, updatedUser.id]);
      updatedUser.credits = 10;
      updatedUser.last_daily_reset = today;
    }
  }
  return updatedUser;
};

// Logic for generation (reused for both /api/generate and /api/generate.php)
const handleGenerate = async (req, res) => {
  try {
    const { userText, preset, referenceImageBase64, isMockupGeneration } = req.body;

    let finalPrompt = "";

    if (isMockupGeneration && referenceImageBase64) {
      const variationSeed = Math.floor(Math.random() * 10000);
      const vibes = ['Soft Lighting', 'Bright Day', 'Cozy Indoor', 'Minimalist Studio', 'Natural Light', 'Warm Atmosphere', 'Cool Tones'];
      const randomVibe = vibes[Math.floor(Math.random() * vibes.length)];

      finalPrompt = `You are an expert product photographer and mockup generator.
YOUR TASK: Take the attached artwork/design and realistically apply it to the product described below.

Product Description: "${userText}"
Context/Vibe: ${randomVibe} (Variation ID: ${variationSeed})

CRITICAL RULES:
1. The attached image MUST be the design printed/stamped on the product.
2. Do NOT change the design itself, just apply it to the 3D surface of the product.
3. Ensure realistic lighting, shadows, and fabric/material texture.
4. The output must be a high-quality photo of the product with the design.
5. Do not add random text or watermarks.`;
    } else if (referenceImageBase64) {
      finalPrompt = `You are an expert image editor and digital artist.
YOUR TASK: Modify the attached reference image based strictly on the user's instruction.

User Instruction: "${userText}"
${preset ? `Target Style: ${preset.promptSuffix}` : ''}

CRITICAL RULES:
1. USE THE ATTACHED IMAGE AS THE FOUNDATION. Do not generate a completely new random image.
2. Apply the requested changes (e.g., add elements, change background, change style) to the existing subject/composition.
3. Maintain high quality, clear outlines, and vivid colors.
4. If asked to remove background, ensure pure white (#FFFFFF) background.
5. Output as a high-quality 2D digital art/sticker.`;
    } else {
      finalPrompt = `Generate a high-quality 2D digital art sticker or clipart.
Subject: ${userText}.
${preset ? `Style Details: ${preset.promptSuffix}` : ''}
Requirements:
- White background (pure white #FFFFFF).
- Clear defined outlines.
- No text inside the image.
- High contrast, vivid colors.
- Vector art style suitable for t-shirt printing.`;
    }

    // --- TRY IMAGE GENERATION FIRST ---
    try {
      console.log("Attempting generation with gemini-3-pro-image-preview...");

      // For experimental SDK, we might need to be careful with how content is structured
      // But based on user request, this worked before or they believe it should work.

      const response = await ai.models.generateContent({
        model: "gemini-3-pro-image-preview",
        contents: [
          {
            role: 'user',
            parts: referenceImageBase64
              ? [
                { inlineData: { mimeType: 'image/png', data: referenceImageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "") } },
                { text: finalPrompt }
              ]
              : [{ text: finalPrompt }]
          }
        ],
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: "1024x1024"
          }
        }
      });

      console.log("Gemini 3 Response received");

      let imageBase64 = null;
      let mimeType = 'image/png';

      if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            imageBase64 = part.inlineData.data;
            if (part.inlineData.mimeType) {
              mimeType = part.inlineData.mimeType;
            }
            break;
          }
        }
      }

      if (imageBase64) {
        const base64String = `data:${mimeType};base64,${imageBase64}`;
        return res.json({ text: base64String });
      }

      console.log("No image found in Gemini 3 response, falling back to SVG...");

    } catch (genError) {
      console.error("Image Generation Error:", genError.message);
      // Don't crash here, strictly fall back
      console.log("Falling back to SVG generation...");
    }

    // --- FALLBACK: SVG GENERATION ---
    let contents = [];
    if (referenceImageBase64) {
      const base64Data = referenceImageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
      contents.push({
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'image/png', data: base64Data } },
          { text: finalPrompt + "\n\nIMPORTANT: Output ONLY the raw SVG code for the design. Do not wrap in markdown code blocks. Start with <svg and end with </svg>." }
        ]
      });
    } else {
      contents.push({
        role: 'user',
        parts: [{ text: finalPrompt + "\n\nIMPORTANT: Output ONLY the raw SVG code for the design. Do not wrap in markdown code blocks. Start with <svg and end with </svg>." }]
      });
    }

    // Use standard model accessible via API
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    // Format content for standard SDK (role/parts)
    // The contents array construction above (lines 153-168) is already compatible 
    // with the standard SDK structure { role, parts: [{ text }, { inlineData }] }

    const result = await model.generateContent({
      contents: contents,
    });

    const response = await result.response;
    const responseText = response.text();

    console.log("Gemini Response Text:", responseText);

    let text = responseText || "";
    // FIX: Ensure no spaces in regex flags
    text = text.replace(/```xml/g, '').replace(/```svg/g, '').replace(/```/g, '');

    if (text.includes('<svg')) {
      const base64Svg = Buffer.from(text).toString('base64');
      text = `data:image/svg+xml;base64,${base64Svg}`;
    }

    res.json({ text: text });

  } catch (error) {
    console.error("Error generating content:", error);
    res.status(500).json({ error: error.message || "Failed to generate content" });
  }
};

// Logic for moderation
const handleModerate = async (req, res) => {
  try {
    const { base64Image } = req.body;

    if (!base64Image) {
      return res.json({ allowed: true });
    }

    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: 'image/png', data: cleanBase64 } },
            { text: "Review this image. Is it a safe, appropriate illustration, vector art, or sticker design? It should not be a raw real-world photo of people, and must not contain NSFW, violence, or hate symbols. Return only 'ALLOWED' if safe or 'REJECTED' if not." }
          ]
        }
      ]
    });

    const text = response.text ? response.text.trim().toUpperCase() : "";
    res.json({ allowed: text.includes("ALLOWED") });

  } catch (error) {
    console.error("Error moderating image:", error);
    res.json({ allowed: true });
  }
};

// Middleware: Check Payment Status
const checkPaymentStatus = async (req, res, next) => {
  // Se não tem token, permite (visitante)
  const authHeader = req.headers['authorization'];
  if (!authHeader) return next();

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = await getDb();
    const user = await db.get('SELECT role, subscription_status FROM users WHERE id = ?', [decoded.id]);

    // Admin sempre pode gerar
    if (user && user.role === 'admin') return next();

    // Bloquear se status de pagamento está atrasado/pendente/cancelado/inativo
    if (user && ['pending', 'overdue', 'cancelled', 'inactive'].includes(user.subscription_status)) {
      return res.status(403).json({
        error: 'Sua conta está com pagamento pendente ou atrasado. Por favor, regularize sua situação para continuar gerando imagens.'
      });
    }

    next();
  } catch (error) {
    // Se erro no token, permite (visitante)
    next();
  }
};

// Routes - Support both standard and .php extensions for local compatibility
app.post('/api/generate', checkPaymentStatus, handleGenerate);
app.post('/api/generate.php', checkPaymentStatus, handleGenerate); // Alias for PHP compatibility

app.post('/api/moderate', handleModerate);
app.post('/api/moderate.php', handleModerate); // Alias for PHP compatibility

// Servir arquivos estáticos do React (pasta dist na raiz do projeto)
app.use(express.static(path.join(__dirname, '../dist')));

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

const authenticateAdmin = async (req, res, next) => {
  authenticateToken(req, res, async () => {
    const db = await getDb();
    const user = await db.get('SELECT role FROM users WHERE id = ?', [req.user.id]);
    if (user && user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ error: 'Admin access required' });
    }
  });
};

// Auth Routes
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const db = await getDb();
    const hashedPassword = await bcrypt.hash(password, 10);

    // Explicitly set credits to 0
    const result = await db.run(
      'INSERT INTO users (email, password, name, credits, role) VALUES (?, ?, ?, 0, "user")',
      [email, hashedPassword, name || email.split('@')[0]]
    );

    const token = jwt.sign({ id: result.lastID, email, role: 'user' }, JWT_SECRET);
    res.json({ token, user: { id: result.lastID, email, name: name || email.split('@')[0], credits: 0, role: 'user' } });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = await getDb();

    // Special Admin Login
    const ADMIN_EMAIL = 'walissoncontapessoal@gmail.com';
    const ADMIN_PASS = 'Ww.eu.33';

    if (email === ADMIN_EMAIL && password === ADMIN_PASS) {
      // Check if admin exists in DB, if not create/update
      let admin = await db.get('SELECT * FROM users WHERE email = ?', [ADMIN_EMAIL]);
      if (!admin) {
        const hashed = await bcrypt.hash(ADMIN_PASS, 10);
        const result = await db.run('INSERT INTO users (email, password, role, credits, name) VALUES (?, ?, "admin", 999999, "Administrator")', [ADMIN_EMAIL, hashed]);
        admin = { id: result.lastID, email: ADMIN_EMAIL, role: 'admin', credits: 999999, name: 'Administrator' };
      } else {
        // Ensure admin role, credits AND password are correct
        const match = await bcrypt.compare(ADMIN_PASS, admin.password);
        if (admin.role !== 'admin' || admin.credits !== 999999 || !match) {
          const hashed = await bcrypt.hash(ADMIN_PASS, 10);
          await db.run('UPDATE users SET role = "admin", credits = 999999, password = ? WHERE id = ?', [hashed, admin.id]);
          admin.role = 'admin';
          admin.credits = 999999;
        }
      }

      const token = jwt.sign({ id: admin.id, email: ADMIN_EMAIL, role: 'admin' }, JWT_SECRET);
      return res.json({ token, user: { id: admin.id, email: ADMIN_EMAIL, role: 'admin', credits: 999999, name: 'Administrator' } });
    }


    let user = await db.get('SELECT * FROM users WHERE email = ?', [email]);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check Daily Reset
    user = await checkDailyReset(db, user);

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
    res.json({
      token, user: {
        id: user.id,
        email: user.email,
        credits: user.credits,
        role: user.role,
        name: user.name,
        plan_type: user.plan_type,
        subscription_status: user.subscription_status
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/me', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.sendStatus(404);

    // Check Daily Reset
    await checkDailyReset(db, user);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        credits: user.credits,
        role: user.role,
        name: user.name,
        plan_type: user.plan_type,
        subscription_status: user.subscription_status,
        subscription_renewal: user.subscription_renewal
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin Routes
app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const users = await db.all('SELECT id, email, password, name, credits, role, status, created_at, plan_type, subscription_status, subscription_renewal FROM users ORDER BY created_at DESC');
    console.log(`📋 Fetched ${users.length} users with plan data`); // DEBUG LOG
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/users/:id/credits', authenticateAdmin, async (req, res) => {
  try {
    const { credits } = req.body;
    const db = await getDb();
    await db.run('UPDATE users SET credits = ? WHERE id = ?', [credits, req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/admin/users/:id', authenticateAdmin, async (req, res) => {
  try {
    console.log(`📝 UPDATE User ${req.params.id} Payload:`, req.body); // DEBUG LOG
    const { name, status, credits, plan_type, subscription_status, subscription_renewal } = req.body;
    const db = await getDb();

    // Dynamic update
    let query = 'UPDATE users SET ';
    let params = [];
    if (name !== undefined) { query += 'name = ?, '; params.push(name); }
    if (status !== undefined) { query += 'status = ?, '; params.push(status); }
    if (credits !== undefined) { query += 'credits = ?, '; params.push(credits); }
    if (plan_type !== undefined) { query += 'plan_type = ?, '; params.push(plan_type); }
    if (subscription_status !== undefined) { query += 'subscription_status = ?, '; params.push(subscription_status); }
    if (subscription_renewal !== undefined) { query += 'subscription_renewal = ?, '; params.push(subscription_renewal); }

    query = query.slice(0, -2); // remove last comma
    query += ' WHERE id = ?';
    params.push(req.params.id);

    console.log(`💾 Executing Query: ${query}`); // DEBUG LOG
    console.log(`💾 Params:`, params); // DEBUG LOG

    await db.run(query, params);

    // Verify update
    const updated = await db.get('SELECT * FROM users WHERE id = ?', [req.params.id]);
    console.log(`✅ User after update:`, updated); // DEBUG LOG

    res.json({ success: true, user: updated });
  } catch (error) {
    console.error("❌ Update Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/admin/users/:id', authenticateAdmin, async (req, res) => {
  try {
    const db = await getDb();
    await db.run('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Qualquer rota que não seja API retorna o index.html do React
// MOVED TO END TO AVOID INTERCEPTING API ROUTES
app.get(/.*/, (req, res) => {
  const indexPath = path.join(__dirname, '../dist', 'index.html');
  import('fs').then(fs => {
    fs.access(indexPath, fs.constants.F_OK, (err) => {
      if (err) {
        res.send('<h1>Servidor Backend Rodando</h1><p>Para acessar o app, use o endereço do Vite (geralmente http://localhost:5173).</p><p>O build de produção (dist) não foi encontrado.</p>');
      } else {
        res.sendFile(indexPath);
      }
    });
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor estático rodando na porta ${PORT} (Versão Atualizada)`);
});
