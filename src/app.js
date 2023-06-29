import express, { json } from 'express'
import cors from 'cors'
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

// Dotenv
dotenv.config();

// Mongo
const mongoClient = new MongoClient(process.env.DATABASE_URL);
let db;

mongoClient.connect()
 .then(() => db = mongoClient.db())
 .catch((err) => console.log(err.message));

// Configuraçoes do server 
const app = express()
const PORT = 5000

app.use(cors())
app.use(express.json())

app.listen(PORT, () => console.log("servidor rodando"))

// Post do server 


app.post('/participants', async(req, res) => {
  const {name} = req.body
  try{
  await db.collection("participants").insertOne({name: name, lastStatus: Date.now()})
  await db.collection("messages").insertOne({from: name,	to: 'Todos', text: 'entra na sala...', type: 'status'})
  res.sendStatus(201)
  }catch (err) { 
    res.status(500).send(err.message) 
  } 
});

app.get('/participants', (req, res) => {
  db.collection("messages").find({}).toArray()
  .then((name) => res.send(name))
  .catch((err) => res.status(500).send(err.message))
});

