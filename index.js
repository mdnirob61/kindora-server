import express from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config'

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGODB_URI);

export async function connectToMongoDB() {
    try {
        await client.connect();
        console.log("You successfully connected to MongoDB!");
        return client;
    } catch (err) {
        console.dir(err);
    }
}
const mongoClient = await connectToMongoDB();
const db = mongoClient.db('kindora');
const eventsCollection = db.collection('events');


app.post('/create-event', async (req, res) => {
    const data = req.body;
    const result = await eventsCollection.insertOne(data);

    res.send(result);
});

app.get('/upcoming-events', async (req, res) => {
    const result = await eventsCollection.find({}).toArray();
    res.send(result)
})

app.get('/upcoming-event/:id', async (req, res) => {
    const { id } = req.params;
    const result = await eventsCollection.findOne({ _id: new ObjectId(id) });
    res.send(result)
})

//http://localhost:5000/upcoming-events

app.get('/', (req, res) => {
    res.send({ msg: "Server is running fine!" });
});


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
