const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const KnexSessionStore = require('connect-session-knex')(session);
const db = require('./database/dbConfig.js');

const server = express();

const sessionConfig = {
  secret: 'nobody.tosses.a.dwarf.!',
  name: 'monkey',
  httpOnly: true,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 1000*60*1
  },
  store: new KnexSessionStore({
    tablename: "session",
    sidfieldname: 'sid',
    knex: db,
    createtable: true,
    clearInterval: 1000*60*60
  })
}
server.use(session(sessionConfig));

server.use(express.json());
server.use(cors());

server.get('/', (req, res) => {
  res.send('Its Alive!');
});

server.post('/register', (req, res)=> {
  const credentials = req.body;

  //hash the password
  const hash = bcrypt.hashSync(credentials.password, 14);
  credentials.password = hash;

  //then save the user
  db('users').insert(credentials)
            .then(ids =>{
              const id = ids[0];
              req.session.username = user.username;
              res.status(201).json({newUserId: id})
            })
            .catch(err=> res.send(err));
});

server.post('/login',(req, res)=>{
  const creds = req.body;
  db('users') .where({username:creds.username})
              .first()
              .then(user=>{
                if(user&& bcrypt.compareSync(creds.password, user.password)){
                  req.session.username = user.username;
                  res.status(200).json({welcome: user.username});

                } else{
                  res.status(401).json({message: 'you shall not pass!'});
                }
              })
              .catch(err=> res.status(500).json({err}));

});

function protected (req, res, next ){
  if (req.session && req.session.username){
    next();
  } else {
    res.send('error!!!');
  }
}

// protect this route, only authenticated users should see it
server.get('/users', protected, (req, res) => {
    db('users')
      .select('id', 'username', 'password')
      .then(users => {
        res.json(users);
      })
      .catch(err => res.send(err));
  
});

server.get('/logout', (req, res)=>{
  if (req.session){
    req.session.destroy(err=>{
      if (err){
        res.send("You can't leave");
      } else {
        res.send("goodbye");
      }

    });
  }
})

server.listen(3300, () => console.log('\nrunning on port 3300\n'));
