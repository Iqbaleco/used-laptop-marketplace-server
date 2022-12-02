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


async function run() {
    try {
        const usersCollection = client.db("UsedLapi").collection("users");
        const brandCollection = client.db("UsedLapi").collection("brand");
        const usedLaptopCollection = client.db("UsedLapi").collection("laptopcollection");
        const bookingsCollection = client.db("UsedLapi").collection("booked");
        const blogCollection = client.db("UsedLapi").collection("blog");
        const statsCollection = client.db("UsedLapi").collection("stats");

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

        app.get('/blog', async (req, res) => {
            const query = {};
            const cursor = blogCollection.find(query);
            const blogs = await cursor.toArray();
            res.send(blogs);
        });

        app.get('/stats', async (req, res) => {
            const query = {};
            const cursor = statsCollection.find(query);
            const stats = await cursor.toArray();
            res.send(stats);
        });

        app.post('/laptopcollection', JwtVerification, sellerVerification, async (req, res) => {
            const collection = req.body;
            const result = await usedLaptopCollection.insertOne(collection);
            res.send(result);
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

        app.get('/dashboard/allbuyers/:role', async (req, res) => {
            const role = req.params.role;
            const query = { role: role };
            const allBuyers = await usersCollection.find(query).toArray();
            res.send(allBuyers);
        })

        app.get('/dashboard/allsellers/:role', async (req, res) => {
            const role = req.params.role;
            const query = { role: role };
            const allSellers = await usersCollection.find(query).toArray();
            res.send(allSellers);
        })

        app.get('/dashboard/myproducts/:email', async (req, res) => {
            const email = req.params.email;
            const query = { seller: email };
            const result = await usedLaptopCollection.find(query).toArray();
            res.send(result);
        })

        app.get('/dashboard/myorders/:email', async (req, res) => {
            const email = req.params.email;
            const query = { buyerEmail: email };
            const result = await bookingsCollection.find(query).toArray();
            res.send(result);
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

        app.get('/laptopcollection', async (req, res) => {
            const query = {};
            const cursor = usedLaptopCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        });

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

        app.delete('/laptopcollection/:name', async (req, res) => {
            const name = req.params.name;
            const query = { name: name };
            // const filter = { _id: ObjectId(id) };
            const result = await usedLaptopCollection.deleteOne(query);
            res.send(result);
        });

        app.put('/laptopcollection/:name', async (req, res) => {
            const name = req.params.name;
            const query = { name: name };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    sale: true
                }
            }
            const result = await usedLaptopCollection.updateOne(query, updatedDoc, options);
            res.send(result);
        });

        app.delete('/users/:name', async (req, res) => {
            const name = req.params.name;
            const query = { name: name };
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        })


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