import express, { json } from 'express'
import cors from 'cors'
import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";
import dayjs from "dayjs";
import joi from "joi"

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
// foramato da message {from: 'João', to: 'Todos', text: 'oi galera', type: 'message', time: '20:04:37'} 

app.post('/participants', async (req, res) => {
  const { name } = req.body

  const userSchema = joi.object({
    name: joi.string().required()
  })
  const validacao = userSchema.validate(req.body)
  if (validacao.error) {
    const errors = validacao.error.details.map((detail) => detail.message);
    return res.status(422).send(errors);
  }

  try {
    const UserName = await db.collection("participants").findOne({ name: name })
    if (UserName) return res.sendStatus(409)
    await db.collection("participants").insertOne({ name: name, lastStatus: Date.now() })
    await db.collection("messages").insertOne({ from: name, to: 'Todos', text: 'entra na sala...', type: 'status', time: dayjs().format('HH:mm:ss') })
    res.sendStatus(201)
  } catch (err) {
    res.status(422).send(err.message)
  }
});

app.get('/participants', (req, res) => {
  db.collection("participants").find({}).toArray()
    .then((name) => res.send(name))
    .catch((err) => res.status(500).send(err.message))
  
});

app.post('/messages', async (req, res) => {
  const { to, text, type } = req.body
  const { user } = req.headers
  console.log(user)
  const userSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.any().allow("message", "private_message").only().required()
  })
  const validacao = userSchema.validate(req.body)
  if (validacao.error) {
    const errors = validacao.error.details.map((detail) => detail.message);
    return res.status(422).send(errors);
  }
  if(user === undefined) return res.sendStatus(422);

  try {
    const promisse = await db.collection("participants").findOne({ name: user}) 
    if(!promisse) return res.sendStatus(422)
    await db.collection("messages").insertOne({ from: user, to, text, type, time: dayjs().format('HH:mm:ss') })
    res.sendStatus(201)
  } catch (err) {
    res.sendStatus(422)
  }
});

app.get('/messages', async (req, res) => {
  const { to, text, type } = req.body
  const { user } = req.headers
  const { limit } = req.query
  
  const userSchema = joi.object({
    limit: joi.number().integer().min(1)
  })
  const validacao = userSchema.validate(req.query)
  if (validacao.error) {
    const errors = validacao.error.details.map((detail) => detail.message);
    return res.sendStatus(422);
  } 
  
  try {
    const promisse = await db.collection("messages").find({ $or: [{ to: "Todos" }, { to: user }, { from: user }] }).toArray()
    res.send(promisse.slice(-(Number(limit))))
  } catch (err) {
    res.send(err)
  }
});

app.post('/status', async (req, res) => {
  const { user } = req.headers
  //const newUser = {name: user, }
  //if(!user) return res.sendStatus(404)
  try {
    const promisse = await db.collection("participants").findOne({ name: user}) 
    if(!promisse) return res.sendStatus(404)
    await db.collection("participants").updateOne({ name: user}, {$set: {name: user, lastStatus: Date.now()}}) 
    res.sendStatus(200)

  } catch (err) {
    res.sendStatus(404)
  }

});

setInterval(async () => {
  const tempoInativo = Date.now() - 10000
  let nameDelete = ""
  let idDelete = 0
  await db.collection("participants").findOne({lastStatus: {$lt: tempoInativo}}) 
  .then((res) => { 
    if(res !== null){
      nameDelete = res.name 
      idDelete = res._id
    } 
  })
  await db.collection("messages").insertOne({ from: nameDelete, to: 'Todos', text: 'sai da sala...', type: 'status', time: dayjs().format('HH:mm:ss')})
  await db.collection("participants").deleteOne({ _id: new ObjectId(idDelete)})

}, 15000)

