import express from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config'
import { createRemoteJWKSet, jwtVerify } from 'jose';

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


// Backend JWS Token Verify
const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).send({ msg: 'Unauthorized!' });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).send({ msg: 'Unauthorized!' });
    }

    const JWKS = createRemoteJWKSet(new URL(`http://localhost:3000/api/auth/jwks`));

    try {
        const { payload } = await jwtVerify(token, JWKS);
        req.user = payload;

        next();
    } catch (error) {
        return res.status(500).send({ msg: 'Internal Server Error.Token not verified!' });
    }
};



// Create Event API
app.post('/create-event', verifyToken, async (req, res) => {
    const data = req.body;

    const result = await eventsCollection.insertOne({
        ...data,
        email: req.user.email,
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
    // console.log(result)
    res.send(result)
});



// Joined Event API
app.post('/joined-event', verifyToken, async (req, res) => {
    const data = req.body;

    // Remove the original event's _id
    delete data._id;

    const alreadyJoined = await joinedEventsCollection.findOne({
        eventId: data.eventId,
        email: req.user.email,
    });

    if (alreadyJoined) {
        return res.status(409).send({
            message: "You have already joined this event!",
        });
    }

    const result = await joinedEventsCollection.insertOne({
        ...data,
        email: req.user.email
    });

    res.status(201).send({
        success: true,
        message: "Successfully joined the event!",
        insertedId: result.insertedId,
    });
});




// Get Joined Events API
app.get('/joined-events', verifyToken, async (req, res) => {
    const result = await joinedEventsCollection.find({ email: req.user.email }).toArray();

    res.send(result);
});

app.delete('/joined-events/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const result = await joinedEventsCollection.deleteOne({
        _id: new ObjectId(id),
        email: req.user.email,
    });
    res.send(result)
});





// Manage Events API
app.get('/manage-events', verifyToken, async (req, res) => {
    const result = await eventsCollection.find({ email: req.user.email }).toArray();

    res.status(200).send(result);
});

app.patch('/manage-events/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { email, ...updatedData } = req.body;
    const result = await eventsCollection.updateOne(
        {
            _id: new ObjectId(id),
            email: req.user.email,
        },
        {
            $set: updatedData,
        }
    );

    res.send(result);
});

app.delete('/manage-events/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const result = await eventsCollection.deleteOne({
        _id: new ObjectId(id),
        email: req.user.email,
    });
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