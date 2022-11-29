const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const jwt = require('jsonwebtoken');

require('dotenv').config();



const port = process.env.PORT || 5000;

const app = express();

// middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ghgcuqm.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function JwtVerification(req, res, next) {

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthorized access');
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    })

}

const adminVerification = async (req, res, next) => {
    const decodedEmail = req.decoded.email;
    const query = { email: decodedEmail };
    const user = await usersCollection.findOne(query);

    if (user?.role !== 'Admin') {
        return res.status(403).send({ message: 'forbidden access' })
    }
    next();
}

const sellerVerification = async (req, res, next) => {
    const decodedEmail = req.decoded.email;
    const query = { email: decodedEmail };
    const user = await usersCollection.findOne(query);

    if (user?.role !== 'Seller') {
        return res.status(403).send({ message: 'forbidden access' })
    }
    next();
}


async function run() {
    try {
        const usersCollection = client.db("UsedLapi").collection("users");
        const brandCollection = client.db("UsedLapi").collection("brand");
        const usedLaptopCollection = client.db("UsedLapi").collection("laptopcollection");
        const bookingsCollection = client.db("UsedLapi").collection("booked");

        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN)
                return res.send({ accessToken: token });
            }
            res.status(403).send({ accessToken: '' })
        });

        app.get('/brand', async (req, res) => {
            const query = {};
            const cursor = brandCollection.find(query);
            const brands = await cursor.toArray();
            res.send(brands);
        });

        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        });

        app.get('/laptopcollection/:brand', async (req, res) => {
            const brand = req.params.brand;
            const query = { brand: brand };
            const allLaptop = await usedLaptopCollection.find(query).toArray();
            res.send(allLaptop);
        })

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ adminCheck: user?.role === 'Admin' });
        })

        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ sellerCheck: user?.role === 'Seller' });
        })

        // app.put('/users/:email', async (req, res) => {
        //     const email = req.params.email;
        //     const user = req.body;
        //     const filter = { email: email }
        //     const options = { upsert: true };
        //     const updatedDoc = {
        //         $set: user
        //     }
        //     const result = await usersCollection.updateOne(filter, updatedDoc, options);
        //     const token = jwt.sign(user, process.env.ACCESS_TOKEN)
        //     res.send(result, token);
        //     console.log(result);
        // });

        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });


    } finally {

    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('UsedLapi server is running')
})

app.listen(port, () => {
    console.log(`UsedLapi Server is running on ${port}`);
})