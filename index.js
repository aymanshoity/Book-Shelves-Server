const express = require('express');
const app = express()
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const cors = require('cors');
const port = process.env.PORT || 5000


// middleware
const corsConfig = {
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
}
app.use(cors(corsConfig))
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.je93mhd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const bookCollections = client.db("Book-Shelves").collection("books");
    const borrowedBooksCollections = client.db("Book-Shelves").collection("borrowedBooks");
    const readerCollections = client.db("Book-Shelves").collection("readers");



    // middlewares
    const verifyToken =async(req, res, next) => {
      console.log('inside Verify Token', req.headers?.authorization)
      if (!req.headers?.authorization) {
        return res.status(401).send({ message: 'Unauthorized Access' })
      }
      const token = req.headers?.authorization?.split(' ')[1]
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        if (error) {
          return res.status(401).send({ message: 'Unauthorized Access' })
        }
        else {
          req.decoded = decoded;
          next()
        }
      })
    }

    const verifyLibrarian=async(req,res,next)=>{
      const email=req.decoded.email;
      const query={email:email}
      const reader=await readerCollections.findOne(query)
      librarian = reader?.role === 'librarian'
      if(!librarian){
        return res.status(403).send({ message: 'Forbidden Access' })
      }
      next()
    }
    // jwt related API

    app.post('/jwt', async (req, res) => {
      const reader = req.body
      const token = jwt.sign(reader, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res.send({ token })
    })

    // readers related Api

    app.post('/readers', async (req, res) => {
      const reader = req.body;
      const query = { email: reader.email }
      const existingReader = await readerCollections.findOne(query)
      if (existingReader) {
        return res.send({ message: 'User Already exist', insertedID: null })
      }
      const result = await readerCollections.insertOne(reader)
      res.send(result)
    })

    app.get('/readers/librarian/:email', verifyToken, async(req, res) => {
      const email = req.params.email;
      if ( email !== req.decoded.email) {
        return res.status(403).send({ message: 'Forbidden Access' })
      }
      const query = { email: email };
      const reader = await readerCollections.findOne(query)
      let librarian = false;
      if (reader) {
        librarian = reader?.role === 'librarian'
      }
      res.send({ librarian })

    })

    app.get('/readers', verifyToken,verifyLibrarian, async (req, res) => {
      const readers = await readerCollections.find().toArray()
      res.send(readers)
    })


    app.delete('/readers/:id',verifyToken,verifyLibrarian, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await readerCollections.deleteOne(query)
      res.send(result)
    })

    app.patch('/readers/librarian/:id',verifyToken,verifyLibrarian, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedRole = {
        $set: {
          role: 'librarian'
        }
      }
      const result = await readerCollections.updateOne(query, updatedRole);
      res.send(result)
    })
    // books related Api

    app.get('/books',verifyToken,verifyLibrarian, async (req, res) => {
      const cursor = await bookCollections.find().toArray()
      res.send(cursor)
    })
    app.post('/books',verifyToken,verifyLibrarian, async (req, res) => {
      const book = req.body;
      const result = await bookCollections.insertOne(book)
      res.send(result)
    })

    app.get('/books/:id', async (req, res) => {
      const id = req.params.id;
      const book = { _id: new ObjectId(id) };
      const result = await bookCollections.findOne(book)
      res.send(result)
    })
    app.get('/books/category/:category',verifyToken, async (req, res) => {
      const category = req.params.category;
      const query = { category: category }
      const result = await bookCollections.find(query).toArray()
      res.send(result)
    })
    app.patch('/books/:id', async (req, res) => {
      const id = req.params.id;
      const book = { _id: new ObjectId(id) };
      const existingBook = req.body;
      const updatedBook = {
        $set: {
          quantity: existingBook.quantity,
        }
      }
      const result = await bookCollections.updateOne(book, updatedBook)
      res.send(result)
    })
    app.patch('/books/:id',verifyToken,verifyLibrarian, async (req, res) => {
      const id = req.params.id;
      const book = { _id: new ObjectId(id) };
      const existingBook = req.body;
      const updatedBook = {
        $set: {
          name: existingBook.name,
          image: existingBook.image,
          authorName: existingBook.authorName,
          ratings: existingBook.ratings,
          category: existingBook.category,
          quantity: existingBook.quantity,

        }
      }
      const result = await bookCollections.updateOne(book, updatedBook)
      res.send(result)
    })
    app.post('/borrowedBooks',verifyToken, async(req, res) => {
      const borrowedBooks = req.body;
      const result = await borrowedBooksCollections.insertOne(borrowedBooks)
      res.send(result)
    })
    app.get('/borrowedBooks',verifyToken,async(req, res) => {
      const result = await borrowedBooksCollections.find().toArray()
      res.send(result)
    })
    app.get('/borrowedBooks/:email',verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { readerEmail: email };
      const result = await borrowedBooksCollections.find(query).toArray()
      res.send(result)

    })
    app.delete('/borrowedBooks/:id', verifyToken,async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await borrowedBooksCollections.deleteOne(query)
      res.send(result)
    })
    app.patch('/books/:id', async (req, res) => {
      const id = req.params.id;
      const book = { _id: new ObjectId(id) };
      const existingBook = req.body;
      const updatedBook = {
        $set: {
          quantity: existingBook.quantity,
        }
      }
      const result = await bookCollections.updateOne(book, updatedBook)
      res.send(result)
    })







    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Book Shelves is opening Soon')
})

app.listen(port, () => {
  console.log(`Book Shelves is running on port ${port}`)
})
