require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_KEY)

const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174', 'https://online-examination-system-server.vercel.app'],
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());

const multer = require('multer');
const storage = multer.memoryStorage(); 
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
    const pdfCollection = dbCollection.collection('pdf');
    const paymentCollection = dbCollection.collection('payments');
    const wishlistCollection = dbCollection.collection('wishlist');
    const sessionCollection = dbCollection.collection('session')

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

    // cq API
    app.get('/cq', async(req,res)=>{
      const search = req.query.search || '' ;
      const category = req.query.category || '';
      const query = {};
      if(search){
        query.name= {$regex: search, $options: 'i'}
      }
      if(category && category != 'all'){
        query.category = category
      }
      const result = await cqCollection.find(query).toArray();
      res.send(result)
    })
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
    app.get('/users', async (req,res)=>{
      const result = await userCollection.find().toArray();
      res.send(result)
    })
  
    app.patch('/users/:email', async(req,res)=>{
      const email = req.params.email;
      const badge = req.body;
      const filter = { email: email };
      const updatedDoc = {
        $set: badge
      }
      const options = { upsert: true };
      const result = await userCollection.updateOne(filter, updatedDoc, options);
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

  // wishlist API
  app.post('/wishlist', async(req,res)=>{
    const data = req.body;
    const result = await wishlistCollection.insertOne(data);
    res.send(result)
  });
  app.get('/wishlist', async(req,res)=>{
    const email = req.query.email;
    const result = await wishlistCollection.find({ email }).toArray();
    res.send(result);
  })
  app.delete('/wishlist/:id', async (req,res)=>{
    const {id} = req.params;
    const query = {_id: new ObjectId(id)}
    const result = await wishlistCollection.deleteOne(query);
    res.send(result)
  })

  // session API
  app.get('/session', async (req,res)=>{
    const result = await sessionCollection.find().toArray();
    res.send(result)
  })

  // payment intent
  app.post('/create-payment-intent', async(req,res)=>{
    const {price} = req.body;
    const amount = Math.round(price * 100);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'usd',
      payment_method_types: [
        'card'
      ]
    })
    res.send({
      clientSecret: paymentIntent.client_secret
    })
  })
  // payment API
  app.post('/payment', async(req,res)=>{
    const paymentInfo = req.body;
    const result = await paymentCollection.insertOne(paymentInfo);
    res.send(result)
  })
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