const express = require('express')
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5000;


//middleware
app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.upife.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


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

        const userCollection = client.db("bangladeshi-handicrafts").collection("users");
        const productCollection = client.db("bangladeshi-handicrafts").collection("products");
        const blogCollection = client.db("bangladeshi-handicrafts").collection("blogs");
        const historyCollection = client.db("bangladeshi-handicrafts").collection("history");

        //jwt related API
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '24h' });
            res.send({ token });
        })

        //middleware
        const verifyToken = (req, res, next) => {
            // console.log('inside verify token: ', req.headers.authorization);
            if (!req.headers.authorization) {
                return res.status(401).send({ message: "forbidden access" })
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorized access' })
                }
                req.decoded = decoded;
                next();
            })
        }

        // use verify admin after verifyToken
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            next();
        }

        //users related API
        app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        });

        app.get("/users/:email", verifyToken, async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await userCollection.findOne(query);
            res.send(result);
        });

        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }

            const query = { email: email };
            const user = await userCollection.findOne(query);
            let admin = false;
            if (user) {
                admin = user?.role === 'admin';
            }
            res.send({ admin });
        })

        app.patch('/users/:email', async (req, res) => {
            console.log('Request body:', req.body);
            console.log('Updating user with email:', req.params.email);
            const email = req.params.email;
            const updatedUser = req.body;

            const query = { email: email };
            const options = { upsert: false }; // Ensures that if no match is found, a new user is not inserted
            const updateDoc = {
                $set: {
                    displayName: updatedUser.displayName,
                    photoURL: updatedUser.photoURL,
                },
            };

            try {
                const result = await userCollection.updateOne(query, updateDoc, options);
                if (result.matchedCount === 0) {
                    return res.status(404).send({ message: 'User not found' });
                }
                res.send({ message: 'User profile updated successfully' });
            } catch (error) {
                console.error('Error updating profile:', error);
                res.status(500).send({ message: 'Failed to update profile' });
            }
        });



        app.post('/users', async (req, res) => {
            const user = req.body;
            //insert email if user does not exist
            const query = { email: user.email }
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'User already exists', insertedId: null })
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        })

        app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        // blogs collection
        app.get("/blogs", async (req, res) => {
            const result = await blogCollection.find().toArray();
            res.send(result);
        })

        // products collection
        app.get("/products", async (req, res) => {
            const result = await productCollection.find().toArray();
            res.send(result);
        })

        app.get('/products/:_id', async (req, res) => {
            const id = req.params._id;
            const query = { _id: new ObjectId(id) };
            const result = await productCollection.findOne(query);
            res.send(result);
        });

        // history collection
        app.get("/history", async (req, res) => {
            const result = await historyCollection.find().toArray();
            res.send(result);
        })




    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('bd-handicrafts is running');
})

app.listen(port, () => {
    console.log(`bangladeshi-handicrafts is listening on ${port}`);
})