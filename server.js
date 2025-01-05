const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const cors = require('cors');

const app = express();

// Use the environment variable for the port, or default to 5000 for local development
const port = process.env.PORT || 5000;

// MongoDB URI
const uri = 'mongodb+srv://dsatm72:DSATM72dsatm@cluster0.8jygx.mongodb.net/studentPortfolioDB?retryWrites=true&w=majority';

// MongoDB client setup outside route handlers
let client;
let studentsCollection;
let adminCollection;

// Update CORS configuration for Netlify front-end
const corsOptions = {
  origin: 'https://moonlit-faun-4ad731.netlify.app', // Replace with your actual Netlify URL
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allow the relevant HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Define allowed headers, if necessary
  credentials: true, // Allow credentials if needed (cookies, tokens)
};

// Middleware
app.use(cors(corsOptions)); // Use specific CORS options
app.use(bodyParser.json());

// Mongo connection
const connectMongoDB = async () => {
  try {
    client = new MongoClient(uri);
    await client.connect();
    studentsCollection = client.db("studentPortfolioDB").collection("students");
    adminCollection = client.db("studentPortfolioDB").collection("admin");
    console.log('MongoDB connected successfully!');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1); // Exit the process if MongoDB connection fails
  }
};

// Routes

// Route to submit a form and insert data into the students collection
app.post('/submit-form', async (req, res) => {
  const formData = req.body;

  try {
    const result = await studentsCollection.insertOne(formData);
    res.status(200).json({ message: "Data inserted successfully", data: result });
  } catch (error) {
    console.error("Error inserting data:", error);
    res.status(500).json({ message: "Error inserting data" });
  }
});

// Route to get all students
app.get('/students', async (req, res) => {
  try {
    const students = await studentsCollection.find().toArray();
    res.status(200).json(students);
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ message: "Error fetching data" });
  }
});

// Route to get a specific student by USN
app.get('/students/:usn', async (req, res) => {
  const { usn } = req.params;

  try {
    const student = await studentsCollection.findOne({ usn });
    if (student) {
      delete student.hobbies;
      res.status(200).json(student);
    } else {
      res.status(404).json({ message: "Student not found" });
    }
  } catch (error) {
    console.error("Error fetching student by USN:", error);
    res.status(500).json({ message: "Error fetching data" });
  }
});

// Route to get all admin data
app.get('/admin', async (req, res) => {
  try {
    const admin = await adminCollection.find().toArray();
    res.status(200).json(admin);
  } catch (error) {
    console.error('Error fetching admin:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Admin login route
app.post('/admin', async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await adminCollection.findOne({ email });

    if (admin && admin.password === password) {
      const username = email.split('@')[0];
      res.status(200).json({
        success: true,
        message: 'Login successful',
        adminName: username,
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Route to update a student's information
app.put('/update-student/:usn', async (req, res) => {
  const { usn } = req.params;
  const updatedData = req.body;

  try {
    const result = await studentsCollection.updateOne(
      { usn },
      { $set: updatedData }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ success: false, message: "Student not found or no changes made." });
    }

    res.status(200).json({ success: true, message: "Student data updated successfully." });
  } catch (error) {
    console.error("Error updating student data:", error);
    res.status(500).json({ success: false, message: "Error updating student data" });
  }
});

// Route to check if a student with a given USN exists
app.get('/check-usn/:usn', async (req, res) => {
  const { usn } = req.params;

  try {
    const student = await studentsCollection.findOne({ usn });
    if (student) {
      res.status(200).json({ exists: true });
    } else {
      res.status(200).json({ exists: false });
    }
  } catch (error) {
    console.error('Error checking USN:', error);
    res.status(500).json({ message: 'Error checking USN' });
  }
});

// Shutdown MongoDB connection gracefully
process.on('SIGINT', async () => {
  console.log('Closing MongoDB connection...');
  await client.close();
  process.exit(0);
});

// Start the server after connecting to MongoDB
connectMongoDB().then(() => {
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
});
