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
const joinedEventsCollection = db.collection('joinedEvents');



// Create Event API
app.post('/create-event', async (req, res) => {
    const data = req.body;

    const result = await eventsCollection.insertOne({
        ...data,
        email: data.email,
    });
    res.send(result)
});



// Upcoming Events API
app.get('/upcoming-events', async (req, res) => {
    const result = await eventsCollection.find({}).toArray();
    res.send(result)
});

app.get('/upcoming-event/:id', async (req, res) => {
    const { id } = req.params;
    const result = await eventsCollection.findOne({ _id: new ObjectId(id) });
    res.send(result)
});



// Joined Event API
app.post('/joined-event', async (req, res) => {
    const data = req.body;
    delete data._id; // Remove _id field if it exists to avoid duplication
    // console.log(data);

    // Check existing participation
    const alreadyJoined = await joinedEventsCollection.findOne({
        eventId: data.eventId,
        email: data.email,
    });

    if (alreadyJoined) {
        return res.status(409).send({
            message: "You have already joined this event!",
        });
    }

    const result = await joinedEventsCollection.insertOne(data);

    res.status(201).send({
        success: true,
        message: "Successfully joined the event!",
        insertedId: result.insertedId,
    });
});




// Get Joined Events API
app.get('/joined-events/:email', async (req, res) => {
    const { email } = req.params;
    const result = await joinedEventsCollection.find({ email: email }).toArray();
    res.send(result);
});

app.delete('/joined-events/:id', async (req, res) => {
    const { id } = req.params;
    const result = await joinedEventsCollection.deleteOne({ _id: new ObjectId(id) });
    res.send(result)
});





// Manage Events API
// Get events created by a specific user
app.get('/manage-events/:email', async (req, res) => {
    const { email } = req.params;

    const result = await eventsCollection.find({ email: email }).toArray();
    res.status(200).send(result);
});

app.patch('/manage-events/:id', async (req, res) => {
    const { id } = req.params;
    const updatedData = req.body;
    const result = await eventsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedData });

    res.send(result);
});

app.delete('/manage-events/:id', async (req, res) => {
    const { id } = req.params;
    const result = await eventsCollection.deleteOne({ _id: new ObjectId(id) });
    res.send(result)
});



//http://localhost:5000//manage-event

app.get('/', (req, res) => {
    res.send({ msg: "Server is running fine!" });
});


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

export default app;