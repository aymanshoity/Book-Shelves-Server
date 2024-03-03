const express = require('express');
const app=express()
require('dotenv').config()
const cors = require('cors');
const port=process.env.PORT || 5000


// middleware
app.use(cors())
app.use(express.json())


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
    await client.connect();

    const bookCollections = client.db("Book-Shelves").collection("books");


    app.get('/books', async(req,res)=>{
        const cursor=await bookCollections.find().toArray()
        res.send(cursor)
    })

    app.get('/books/:category', async(req,res)=>{
        const query=req.params.category;
        const category={category: query};
        const result=await bookCollections.find(category).toArray()
        res.send(result)
    })
    app.get('/books/:id', async(req,res)=>{
        const id=req.params.id;
        const book={_id: new ObjectId(id)};
        const result=await bookCollections.findOne(book)
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


app.get('/',(req,res)=>{
    res.send('Book Shelves is opening Soon')
})

app.listen(port,()=>{
    console.log(`Book Shelves is running on port ${port}`)
})
