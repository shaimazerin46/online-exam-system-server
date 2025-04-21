require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_KEY)

const corsOptions = {
  origin: [
    'http://localhost:5173', 
    'http://localhost:5174',
    'https://online-exam-system-f2b2b.web.app',
    'https://online-examination-system-server.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));
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
    app.post('/exams', async (req,res)=>{
      const data = req.body;
      const result = await examCollection.insertOne(data);
      res.send(result)
    })
    app.patch('/exams/:id', async(req,res)=>{
      const id = req.params.id
      const data = req.body;
      const filter = {_id: new ObjectId(id)};
      const updatedDoc = {
        $set: {
          name: data.name,
          category: data.category,
          image: data.image,
          description: data.description,
          questions: data.questions,
        }
      }
      const result = await examCollection.updateOne(filter, updatedDoc);
      res.send(result)
    })
    app.delete('/exams/:id', async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await examCollection.deleteOne(query);
      res.send(result)
    })

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
    app.post('/cq', async(req,res)=>{
      const data = req.body;
      const result = await cqCollection.insertOne(data);
      res.send(result)
    });
    app.patch('/cq/:id', async (req, res) => {
      const id = req.params.id;
      const data = req.body;
    
      try {
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            name: data.name,
            category: data.category,
            image: data.image,
            description: data.description,
            questions: data.questions
          }
        };
    
        const result = await cqCollection.updateOne(filter, updateDoc);
        res.send(result);
      } catch (err) {
        res.status(500).send({ message: "Update failed", error: err.message });
      }
    });
    app.delete('/cq/:id', async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await cqCollection.deleteOne(query);
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
    app.get('/results', async(req,res)=>{
      const result = await resultCollections.find().toArray();
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
    });
    
    app.patch('/users/admin/:id', async(req,res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updatedDoc ={
        $set: {
          role: 'admin'
        }
      }
      const options = { upsert: true };
      const result = await userCollection.updateOne(filter,updatedDoc,options);
      res.send(result)
    });
    // pdf collection
    app.post('/pdf', upload.any(), async (req, res) => {
      try {
          const examId = req.body.examId;
          const examName = req.body.examName;
          const email = req.body.email;
          const marks = req.body.totalMarks
  
          const answers = [];
  
          for (const file of req.files) {
              const indexMatch = file.fieldname.match(/answers\[(\d+)\]\[file\]/);
              if (indexMatch) {
                  const index = indexMatch[1];
                  answers.push({
                      fileName: file.originalname,
                      fileBuffer: file.buffer, 
                      
                  });
              }
          }
  
          const result = await pdfCollection.insertOne({
              email,
              examId,
              examName,
              answers,
              marks
          });
  
          res.send({ insertedId: result.insertedId });
      } catch (err) {
          console.error('Upload error:', err.message);
          res.status(500).send({ error: 'Something went wrong' });
      }
  });

  app.get('/pdf', async(req,res)=>{
    const result = await pdfCollection.find().toArray();
    res.send(result);
  }) 

  app.patch('/pdf/:id', async (req,res)=>{
    const id = req.params.id;
    const { givenMarks } = req.body;
    const filter = {_id: new ObjectId(id)};
    const updatedDoc = {
      $set: {
        givenMarks: givenMarks
      }
    }
    const options = { upsert: true };
    const result = await pdfCollection.updateOne(filter,updatedDoc,options)
    res.send(result)
  })

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
  app.post('/session', async (req,res)=>{
    const data = req.body;
    const result = await sessionCollection.insertOne(data);
    res.send(result)
  })
  app.patch('/session/:id', async(req,res)=>{
    const id = req.params.id;
    const data = req.body;
    const filter = {_id: new ObjectId(id)}
    const updatedDoc = {
      $set: {
        title: data.title,
        description: data.description,
        speaker: data.speaker,
        scheduledTime: data.scheduledTime,
        durationMinutes: data.durationMinutes,
        link: data.link
      }
    }
    const result = await sessionCollection.updateOne(filter, updatedDoc);
    res.send(result)
  })
  app.delete('/session/:id', async(req,res)=>{
    const id = req.params.id;
    const query = {_id: new ObjectId(id)}
    const result = await sessionCollection.deleteOne(query);
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
  app.get('/payment', async(req,res)=>{
    const result = await paymentCollection.find().toArray();
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