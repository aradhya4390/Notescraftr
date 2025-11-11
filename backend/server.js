require('dotenv').config()
console.log('MONGO_URI from env:', process.env.MONGO_URI);
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const errorHandler = require('./middleware/app.error');
const cors = require('cors');
const PDFDocument = require('pdfkit');
const axios = require('axios');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connect
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1);
});

// User Schema
const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

// Enhanced Note Schema with AI features
const noteSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    tags: [{
        type: String,
        trim: true
    }],
    category: {
        type: String,
        enum: ['personal', 'work', 'ideas', 'important'],
        default: 'personal'
    },
    // AI Enhancement fields
    aiGenerated: {
        type: Boolean,
        default: false
    },
    aiTopic: {
        type: String,
        trim: true
    },
    detectedSubject: {
        type: String,
        trim: true
    },
    suggestedSubject: {
        type: String,
        trim: true
    },
    contentScore: {
        type: Number,
        min: 0,
        max: 1,
        default: 1 // 1 = appropriate, 0 = inappropriate
    },
    isModerated: {
        type: Boolean,
        default: false
    },
    moderationFlags: [{
        type: String,
        enum: ['inappropriate_content', 'wrong_subject', 'spam', 'abusive']
    }],
    isFavorite: {
        type: Boolean,
        default: false
    },
    isArchived: {
        type: Boolean,
        default: false
    },
    isTrashed: {
        type: Boolean,
        default: false
    },
    isPublished: {
        type: Boolean,
        default: false
    },
    reminder: {
        date: Date,
        isEnabled: {
            type: Boolean,
            default: false
        }
    },
    timestamp: { 
        type: Date, 
        default: Date.now 
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt field before saving
noteSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

const Note = mongoose.model('Note', noteSchema);

// UPDATED AI Generated Notes Schema - simplified to only use topic
const aiNoteSchema = new mongoose.Schema({
    requestedTopic: {
        type: String,
        required: true,
        trim: true
    },
    generatedContent: {
        type: String,
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const AINote = mongoose.model('AINote', aiNoteSchema);

// Reminder Schema
const reminderSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    date: {
        type: Date,
        required: true
    },
    time: {
        type: String,
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    isCompleted: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Reminder = mongoose.model('Reminder', reminderSchema);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }
        req.user = user;
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Invalid or expired token' });
    }
};

// AI Content Moderation Function
async function moderateContent(content, title, topic) {
    try {
        // Enhanced keyword-based moderation
        const inappropriateKeywords = [
            'abuse', 'hate', 'violent', 'drugs', 'illegal', 'harmful',
            'explicit', 'inappropriate', 'offensive', 'discriminatory',
            'racist', 'sexist', 'harassment', 'bullying', 'threat'
        ];
        
        const contentLower = (content + ' ' + title).toLowerCase();
        const flags = [];
        let score = 1;

        // Check for inappropriate content
        for (const keyword of inappropriateKeywords) {
            if (contentLower.includes(keyword)) {
                flags.push('inappropriate_content');
                score -= 0.3;
                break;
            }
        }

        // Enhanced topic detection based on keywords
        const topicCategories = {
            physics: [
                'physics', 'force', 'energy', 'motion', 'gravity', 'electricity', 
                'magnetism', 'velocity', 'acceleration', 'momentum', 'friction',
                'thermodynamics', 'optics', 'quantum', 'relativity', 'mechanics'
            ],
            chemistry: [
                'chemistry', 'element', 'compound', 'reaction', 'molecule', 'atom',
                'periodic', 'chemical', 'bond', 'solution', 'acid', 'base',
                'organic', 'inorganic', 'catalyst', 'oxidation', 'reduction'
            ],
            biology: [
                'biology', 'cell', 'organism', 'dna', 'evolution', 'anatomy',
                'ecosystem', 'genetics', 'photosynthesis', 'respiration',
                'reproduction', 'classification', 'biodiversity', 'ecology'
            ],
            mathematics: [
                'math', 'equation', 'formula', 'calculation', 'algebra', 'geometry',
                'calculus', 'trigonometry', 'statistics', 'probability',
                'number', 'function', 'graph', 'theorem', 'proof'
            ],
            history: [
                'history', 'ancient', 'medieval', 'war', 'civilization', 'empire',
                'revolution', 'treaty', 'battle', 'dynasty', 'culture',
                'archaeology', 'timeline', 'historical', 'period'
            ],
            geography: [
                'geography', 'continent', 'country', 'climate', 'mountain', 'river',
                'ocean', 'desert', 'forest', 'population', 'capital', 'map',
                'terrain', 'latitude', 'longitude', 'hemisphere'
            ],
            literature: [
                'literature', 'novel', 'poem', 'story', 'author', 'character',
                'plot', 'theme', 'metaphor', 'symbolism', 'poetry',
                'fiction', 'nonfiction', 'drama', 'prose'
            ],
            computer_science: [
                'programming', 'algorithm', 'software', 'hardware', 'database',
                'network', 'coding', 'computer', 'technology', 'internet',
                'artificial intelligence', 'machine learning', 'data structure'
            ]
        };

        let detectedSubject = 'general';
        let maxMatches = 0;

        for (const [subjectName, keywords] of Object.entries(topicCategories)) {
            let matches = 0;
            keywords.forEach(keyword => {
                if (contentLower.includes(keyword)) matches++;
            });
            if (matches > maxMatches) {
                maxMatches = matches;
                detectedSubject = subjectName;
            }
        }

        // Check content quality
        if (content.length < 50) {
            flags.push('low_quality');
            score -= 0.1;
        }

        return {
            score: Math.max(0, score),
            detectedSubject,
            flags,
            isAppropriate: score > 0.5
        };
        
    } catch (error) {
        console.error('Content moderation error:', error);
        return {
            score: 0.5,
            detectedSubject: 'unknown',
            flags: [],
            isAppropriate: true
        };
    }
}

// UPDATED AI Note Generation Function - simplified to use only topic
async function generateNotesFromTopic(topic) {
    try {
        const topicLower = topic.toLowerCase();
        
        // Enhanced note templates based on topic keywords
        if (topicLower.includes('physics') || topicLower.includes('motion') || topicLower.includes('force')) {
            return generatePhysicsNotes(topic);
        } else if (topicLower.includes('chemistry') || topicLower.includes('atom') || topicLower.includes('element')) {
            return generateChemistryNotes(topic);
        } else if (topicLower.includes('biology') || topicLower.includes('cell') || topicLower.includes('organism')) {
            return generateBiologyNotes(topic);
        } else if (topicLower.includes('math') || topicLower.includes('algebra') || topicLower.includes('calculus')) {
            return generateMathNotes(topic);
        } else if (topicLower.includes('history') || topicLower.includes('war') || topicLower.includes('ancient')) {
            return generateHistoryNotes(topic);
        } else if (topicLower.includes('geography') || topicLower.includes('climate') || topicLower.includes('continent')) {
            return generateGeographyNotes(topic);
        } else {
            return generateGeneralNotes(topic);
        }

    } catch (error) {
        console.error('Note generation error:', error);
        throw new Error('Failed to generate notes for the given topic');
    }
}

// Specific note generators for different subjects
function generatePhysicsNotes(topic) {
    return `# ${topic} - Physics Study Notes

## Introduction
${topic} is a fundamental concept in physics that helps us understand the physical world around us.

## Key Concepts
• **Fundamental Laws**: Basic principles governing ${topic}
• **Mathematical Relationships**: Equations and formulas
• **Real-world Applications**: How ${topic} applies in daily life
• **Problem-solving Methods**: Systematic approaches to solve problems

## Important Formulas
• Force = Mass × Acceleration (F = ma)
• Kinetic Energy = ½mv²
• Potential Energy = mgh
• Work = Force × Displacement

## Applications
${topic} has applications in:
- Engineering and construction
- Transportation systems
- Renewable energy
- Space exploration
- Medical technology

## Study Tips
1. Understand the underlying principles
2. Practice numerical problems regularly
3. Draw diagrams to visualize concepts
4. Relate physics concepts to everyday phenomena
5. Use dimensional analysis to check answers

## Practice Questions
1. Define the key terms related to ${topic}
2. Derive important formulas step by step
3. Solve numerical problems of varying difficulty
4. Explain real-world applications

*Note: This content was generated by AI. Please cross-reference with your textbooks and consult your teacher for clarification.*`;
}

function generateChemistryNotes(topic) {
    return `# ${topic} - Chemistry Study Notes

## Overview
${topic} is an important area of chemistry that deals with the composition, structure, and properties of matter.

## Key Areas to Study
• **Atomic Structure**: Understanding atoms and their components
• **Chemical Bonding**: How atoms combine to form compounds
• **Chemical Reactions**: Types and mechanisms of reactions
• **Stoichiometry**: Quantitative relationships in chemistry

## Fundamental Concepts
1. **Elements and Compounds**: Basic building blocks of matter
2. **Periodic Table**: Organization of elements by properties
3. **Chemical Equations**: Representing chemical changes
4. **Molecular Structure**: 3D arrangement of atoms

## Laboratory Skills
- Proper use of chemical equipment
- Safety procedures and precautions
- Accurate measurement techniques
- Observation and data recording

## Applications in Daily Life
${topic} is relevant to:
- Food chemistry and nutrition
- Environmental science
- Medicine and pharmaceuticals
- Materials science
- Industrial processes

## Study Strategy
1. Master the fundamental concepts first
2. Practice balancing chemical equations
3. Solve stoichiometry problems
4. Understand periodic trends
5. Connect theory with practical applications

*AI-generated content for study purposes. Verify with authoritative chemistry resources.*`;
}

function generateBiologyNotes(topic) {
    return `# ${topic} - Biology Study Notes

## Introduction to ${topic}
Biology is the study of life and living organisms. ${topic} represents a crucial aspect of biological science.

## Core Concepts
• **Cell Biology**: Structure and function of cells
• **Genetics**: Heredity and variation in organisms
• **Evolution**: How species change over time
• **Ecology**: Interactions between organisms and environment

## Key Processes
1. **Metabolism**: Chemical reactions in living organisms
2. **Homeostasis**: Maintaining internal balance
3. **Reproduction**: Continuation of species
4. **Growth and Development**: Life cycle changes

## Classification and Diversity
- Understanding taxonomic hierarchies
- Biodiversity and its importance
- Adaptation and survival strategies
- Ecosystem relationships

## Practical Applications
${topic} relates to:
- Medical and health sciences
- Agriculture and food production
- Conservation efforts
- Biotechnology and research
- Environmental protection

## Study Methods
1. Create detailed diagrams and flowcharts
2. Use mnemonics for complex terms
3. Relate concepts to real examples
4. Practice with past exam questions
5. Understand rather than memorize

## Review Questions
- What are the main characteristics of ${topic}?
- How does ${topic} relate to other biological concepts?
- What are some practical applications?

*This AI-generated study material should supplement your official biology textbooks.*`;
}

function generateMathNotes(topic) {
    return `# ${topic} - Mathematics Study Notes

## Mathematical Concepts in ${topic}
Mathematics is the foundation of logical thinking and problem-solving. ${topic} represents key mathematical principles.

## Fundamental Principles
• **Number Systems**: Understanding different types of numbers
• **Algebraic Operations**: Working with variables and expressions
• **Geometric Relationships**: Spatial reasoning and measurements
• **Statistical Analysis**: Data interpretation and probability

## Problem-Solving Strategies
1. **Understand the Problem**: Read carefully and identify what's asked
2. **Plan the Solution**: Choose appropriate methods and formulas
3. **Execute the Plan**: Work step-by-step systematically
4. **Check the Answer**: Verify results and reasonableness

## Key Formulas and Theorems
- Basic arithmetic operations
- Algebraic identities
- Geometric formulas
- Trigonometric relationships

## Applications
${topic} is used in:
- Science and engineering
- Economics and finance
- Computer science and technology
- Architecture and design
- Statistical analysis and research

## Study Tips
1. Practice regularly with varied problems
2. Understand concepts before memorizing formulas
3. Work through examples step by step
4. Identify patterns and relationships
5. Seek help when concepts are unclear

## Common Mistakes to Avoid
- Rushing through calculations
- Ignoring units and significant figures
- Not checking work for accuracy
- Memorizing without understanding

*AI-generated mathematics study guide. Practice with your textbook problems for mastery.*`;
}

function generateHistoryNotes(topic) {
    return `# ${topic} - History Study Notes

## Historical Context of ${topic}
History helps us understand the past and its influence on the present. ${topic} represents significant historical developments.

## Key Historical Elements
• **Timeline**: Chronological sequence of events
• **Causes and Effects**: Understanding historical causation
• **Historical Figures**: Important people and their contributions
• **Cultural and Social Context**: Society, politics, and economics

## Major Themes
1. **Political Changes**: Government systems and leadership
2. **Social Movements**: Changes in society and culture
3. **Economic Developments**: Trade, industry, and commerce
4. **Technological Advances**: Innovations and their impact

## Analysis Framework
- Primary and secondary sources
- Historical evidence and interpretation
- Multiple perspectives on events
- Bias and reliability of sources

## Study Methods for History
1. Create timelines to visualize chronology
2. Make connections between different events
3. Analyze cause-and-effect relationships
4. Compare different historical interpretations
5. Use maps to understand geographical context

## Important Questions
- What were the main causes of ${topic}?
- How did ${topic} affect different groups of people?
- What were the long-term consequences?
- How do historians interpret these events differently?

*AI-generated historical study notes. Cross-reference with primary sources and scholarly works.*`;
}

function generateGeographyNotes(topic) {
    return `# ${topic} - Geography Study Notes

## Geographical Understanding of ${topic}
Geography studies the Earth's physical features and human activities. ${topic} encompasses important geographical concepts.

## Physical Geography
• **Landforms**: Mountains, plains, rivers, and coastlines
• **Climate**: Weather patterns and atmospheric conditions
• **Natural Resources**: Distribution and availability
• **Ecosystems**: Interaction between environment and organisms

## Human Geography
1. **Population**: Distribution, density, and migration
2. **Settlements**: Cities, towns, and rural areas
3. **Economic Activities**: Agriculture, industry, and services
4. **Cultural Geography**: Languages, religions, and customs

## Geographical Skills
- Map reading and interpretation
- Use of geographical tools and technology
- Data analysis and presentation
- Fieldwork techniques

## Environmental Issues
${topic} relates to:
- Climate change and global warming
- Natural disasters and their management
- Sustainable development
- Conservation of natural resources

## Study Techniques
1. Use maps and atlases regularly
2. Understand scale and projections
3. Analyze geographical data and statistics
4. Connect physical and human geography
5. Stay updated with current geographical issues

*AI-generated geography notes. Supplement with current maps and geographical data.*`;
}

function generateGeneralNotes(topic) {
    return `# ${topic} - Comprehensive Study Notes

## Overview of ${topic}
This study guide covers the essential concepts and information related to ${topic}.

## Key Learning Objectives
• Understand fundamental principles and concepts
• Identify important terms and definitions
• Recognize real-world applications and examples
• Develop critical thinking and analysis skills

## Main Topics to Cover
1. **Introduction and Background**: Basic understanding of ${topic}
2. **Core Concepts**: Essential ideas and principles
3. **Applications**: How ${topic} applies in practice
4. **Current Developments**: Recent advances and discoveries

## Study Strategies
- Break down complex topics into smaller parts
- Use active learning techniques
- Create mind maps and visual aids
- Practice with examples and exercises
- Discuss concepts with peers and teachers

## Assessment Preparation
• Review key terms and definitions
• Practice problem-solving techniques
• Understand theoretical frameworks
• Prepare for different question types

## Additional Resources
- Textbooks and academic journals
- Online educational platforms
- Educational videos and documentaries
- Expert lectures and seminars

## Review Questions
1. What are the main components of ${topic}?
2. How does ${topic} relate to other subjects?
3. What are some practical applications?
4. What are current trends and developments?

*This AI-generated study guide provides a foundation. Always verify information with authoritative sources and your course materials.*`;
}

// Routes
app.get('/', (req, res) => {
    res.send('Enhanced NoteCraftr API with Simplified AI Features is running! 🚀');
});

// SIGNUP Route
app.post('/api/signup', async (req, res) => {
    try {
        const { firstName, lastName, email, password, confirmPassword } = req.body;

        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({ 
                message: 'All fields are required' 
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ 
                message: 'Passwords do not match' 
            });
        }

        if (password.length < 6) {
            return res.status(400).json({ 
                message: 'Password must be at least 6 characters long' 
            });
        }

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ 
                message: 'User with this email already exists' 
            });
        }

        const newUser = new User({
            firstName,
            lastName,
            email: email.toLowerCase(),
            password
        });

        await newUser.save();

        res.status(201).json({ 
            message: 'User created successfully',
            user: {
                id: newUser._id,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                email: newUser.email
            }
        });

    } catch (error) {
        console.error('Signup Error:', error);
        res.status(500).json({ 
            message: 'Internal server error during signup' 
        });
    }
});

// LOGIN Route
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ 
                message: 'Email and password are required' 
            });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ 
                message: 'Invalid email or password' 
            });
        }

        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ 
                message: 'Invalid email or password' 
            });
        }

        const token = jwt.sign(
            { userId: user._id },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ 
            message: 'Internal server error during login' 
        });
    }
});

// Get all notes
app.get('/api/notes', authenticateToken, async (req, res) => {
    try {
        const notes = await Note.find({ 
            user: req.user._id,
            isTrashed: false 
        }).sort({ timestamp: -1 });
        res.json(notes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create note with moderation
app.post('/api/notes', authenticateToken, async (req, res) => {
    try {
        const { title, content, tags, category, subject } = req.body;
        
        // Moderate content
        const moderation = await moderateContent(content, title, subject);
        
        const note = new Note({
            title,
            content,
            tags: tags || [],
            category: category || 'personal',
            user: req.user._id,
            detectedSubject: moderation.detectedSubject,
            suggestedSubject: moderation.detectedSubject !== subject ? moderation.detectedSubject : null,
            contentScore: moderation.score,
            isModerated: !moderation.isAppropriate,
            moderationFlags: moderation.flags,
            isPublished: moderation.isAppropriate
        });

        const savedNote = await note.save();
        res.json(savedNote);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update note
app.put('/api/notes/:id', authenticateToken, async (req, res) => {
    try {
        const { title, content, tags, category, subject, isFavorite, isArchived, isTrashed } = req.body;
        
        let updateData = {
            title,
            content,
            tags,
            category,
            isFavorite,
            isArchived,
            isTrashed,
            updatedAt: new Date()
        };

        // Re-moderate if content changed
        if (title || content) {
            const moderation = await moderateContent(content, title, subject);
            updateData.detectedSubject = moderation.detectedSubject;
            updateData.suggestedSubject = moderation.detectedSubject !== subject ? moderation.detectedSubject : null;
            updateData.contentScore = moderation.score;
            updateData.isModerated = !moderation.isAppropriate;
            updateData.moderationFlags = moderation.flags;
            updateData.isPublished = moderation.isAppropriate;
        }

        const updatedNote = await Note.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );
        
        if (!updatedNote) {
            return res.status(404).json({ message: 'Note not found' });
        }
        
        res.json(updatedNote);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete note
app.delete('/api/notes/:id', authenticateToken, async (req, res) => {
    try {
        const deletedNote = await Note.findByIdAndDelete(req.params.id);
        if (!deletedNote) {
            return res.status(404).json({ message: 'Note not found' });
        }
        res.json({ message: 'Note deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// UPDATED AI Note Generation Route - simplified to only use topic
app.post('/api/ai/generate-notes', authenticateToken, async (req, res) => {
    try {
        const { topic } = req.body;

        if (!topic || !topic.trim()) {
            return res.status(400).json({
                message: 'Topic is required for AI note generation'
            });
        }

        const cleanTopic = topic.trim();

        // Generate notes content based on topic
        const generatedContent = await generateNotesFromTopic(cleanTopic);

        // Save AI generated note record
        const aiNote = new AINote({
            requestedTopic: cleanTopic,
            generatedContent,
            user: req.user._id
        });

        await aiNote.save();

        // Create a regular note with AI flag
        const note = new Note({
            title: `${cleanTopic} - AI Generated Study Notes`,
            content: generatedContent,
            tags: ['AI-Generated', 'Study Notes'],
            category: 'important',
            user: req.user._id,
            aiGenerated: true,
            aiTopic: cleanTopic,
            detectedSubject: 'study_notes',
            contentScore: 1,
            isPublished: true
        });

        const savedNote = await note.save();

        res.json({
            message: 'AI study notes generated successfully',
            note: savedNote,
            aiNote: aiNote
        });

    } catch (error) {
        console.error('AI Note Generation Error:', error);
        res.status(500).json({
            message: error.message || 'Failed to generate AI notes'
        });
    }
});

// Generate PDF for notes
app.post('/api/notes/:id/generate-pdf', authenticateToken, async (req, res) => {
    try {
        const note = await Note.findById(req.params.id);
        if (!note) {
            return res.status(404).json({ message: 'Note not found' });
        }

        // Create PDF
        const doc = new PDFDocument();
        const filename = `${note.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        doc.pipe(res);

        // Add content to PDF
        doc.fontSize(20).text(note.title, 50, 50);
        doc.fontSize(12).text(`Created: ${note.timestamp.toDateString()}`, 50, 80);
        
        if (note.tags && note.tags.length > 0) {
            doc.text(`Tags: ${note.tags.join(', ')}`, 50, 100);
        }

        if (note.aiGenerated && note.aiTopic) {
            doc.text(`AI Generated for Topic: ${note.aiTopic}`, 50, 120);
        }

        doc.moveDown(2);
        doc.fontSize(14).text(note.content, 50, doc.y, {
            width: 500,
            align: 'justify'
        });

        if (note.aiGenerated) {
            doc.moveDown(2);
            doc.fontSize(10).text('* This note was generated using AI assistance for educational purposes', 50, doc.y, {
                width: 500,
                align: 'center'
            });
        }

        doc.end();

    } catch (error) {
        console.error('PDF Generation Error:', error);
        res.status(500).json({ message: 'Failed to generate PDF' });
    }
});

// Get moderated notes (for admin review)
app.get('/api/moderated-notes', authenticateToken, async (req, res) => {
    try {
        const moderatedNotes = await Note.find({ 
            user: req.user._id,
            isModerated: true,
            contentScore: { $lt: 0.8 }
        }).sort({ timestamp: -1 });
        
        res.json(moderatedNotes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Approve moderated note
app.put('/api/notes/:id/approve', authenticateToken, async (req, res) => {
    try {
        const updatedNote = await Note.findByIdAndUpdate(
            req.params.id,
            { 
                isModerated: false,
                isPublished: true,
                moderationFlags: []
            },
            { new: true }
        );
        
        if (!updatedNote) {
            return res.status(404).json({ message: 'Note not found' });
        }
        
        res.json(updatedNote);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get AI generation history
app.get('/api/ai/history', authenticateToken, async (req, res) => {
    try {
        const aiHistory = await AINote.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .limit(20);
        
        res.json(aiHistory);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'NoteCraftr API is running smoothly',
        timestamp: new Date().toISOString(),
        features: ['AI Note Generation', 'Content Moderation', 'PDF Export']
    });
});

// Error handling middleware
app.use(errorHandler);

// Handle 404 routes
app.use('*', (req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Enhanced NoteCraftr Server with Simplified AI Features running on port ${PORT}`);
    console.log(`📝 Features: Topic-based AI Generation, Content Moderation, PDF Export`);
    console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
});