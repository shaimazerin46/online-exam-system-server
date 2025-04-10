require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require('mongodb');

app.use(cors());
app.use(express.json());

const multer = require('multer');
const storage = multer.memoryStorage(); // or use diskStorage if you want to store on disk
const upload = multer();

const uri = `mongodb+srv://${process.env.DB_ADMIN}:${process.env.DB_PASS}@cluster0.qkg2o.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
   
    const dbCollection = client.db('examinationSystem');
    const examCollection = dbCollection.collection('exams');
    const packageCollection = dbCollection.collection('packeges');
    const resultCollections = dbCollection.collection('results');
    const userCollection = dbCollection.collection('users');
    const cqCollection = dbCollection.collection('cq');
    const pdfCollection = dbCollection.collection('pdf')

    app.get('/exams', async (req,res)=>{
      const search = req.query.search || '';
      const category = req.query.category || '';
      const query = {};
      if(search){
        query.name = {$regex: search, $options: 'i'};
      }
      if(category && category != 'all'){
        query.category = category;
      }
        const result = await examCollection.find(query).toArray();
        res.send(result)
    });

    // package API
    app.get('/allPackages', async(req,res)=>{
      const result = await packageCollection.find().toArray();
      res.send(result)
    })

    // results API
    app.post('/results', async(req,res)=>{
      const userInfo = req.body;
      const result = await resultCollections.insertOne(userInfo);
      res.send(result);
    })

    // user API
    app.post('/users', async (req,res)=>{
      const data = req.body;
      const result = await userCollection.insertOne(data);
      res.send(result)
    })

    // cq API
    app.get('/cq', async(req,res)=>{
      const result = await cqCollection.find().toArray();
      res.send(result)
    })

    // pdf collection
    app.post('/pdf', upload.any(), async (req, res) => {
      try {
          const examId = req.body.examId;
          const examName = req.body.examName;
  
          const answers = [];
  
          for (const file of req.files) {
              const indexMatch = file.fieldname.match(/answers\[(\d+)\]\[file\]/);
              if (indexMatch) {
                  const index = indexMatch[1];
                  answers.push({
                      fileName: file.originalname,
                      fileBuffer: file.buffer, // You can convert or store this
                      
                  });
              }
          }
  
          const result = await pdfCollection.insertOne({
              examId,
              examName,
              answers
          });
  
          res.send({ insertedId: result.insertedId });
      } catch (err) {
          console.error('Upload error:', err.message);
          res.status(500).send({ error: 'Something went wrong' });
      }
  });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");


  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req,res)=>{
    res.send("server is cooking")
})

app.listen(port, ()=>{
    console.log(`server is cooking on port ${port}`)
})