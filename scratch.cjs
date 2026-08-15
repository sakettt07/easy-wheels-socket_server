require('dotenv').config({path: '.env'});
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI).then(() => {
    return mongoose.connection.db.collection('bookings').aggregate([
        { $group: { _id: '$bookingStatus', count: { $sum: 1 } } }
    ]).toArray();
}).then(docs => {
    console.log(docs);
    process.exit(0);
}).catch(console.error);
