const ronin = require('ronin-server');

const server = ronin.server();

// Define the route handler for /pintu
server.get('/pintu', (req, res) => {
  const response = {
    code: '~~~pintu node <3!~~~',
    meta: {
      total: 0,
      count: 0
    },
    payload: []
  };

  res.json(response);
});

server.start();
