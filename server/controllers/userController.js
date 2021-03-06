const fetch = require('node-fetch');
const db = require('../buddyModels');
const Octokat = require('octokat');
const octo = new Octokat({ token: 'b00a94451c1b2a5dd2cb8dcde81c4264ad3b1474' });
const session = require('express-session');

const userController = {};

userController.getUser = (req, res, next) => {
  //check db if user in database
  const queryToGet = {
    text: 'SELECT * FROM users WHERE github_user_id = $1',
    values: [`${res.locals.user.id}`],
  };
  db.query(queryToGet, (err, result) => {
    if (result.rows.length === 0) {
      return next();
    } else if (err) {
      return next({
        message: 'Error getting users',
        error: err,
      });
    } else {
      // console.log(result.rows)
      res.locals.user = result.rows[0];
      res.locals.userFound = true;
      //return res.json(res.locals.user);
      return next();
    }
  });
};

userController.createUser = (req, res, next) => {
  if (res.locals.userFound === true) return next();
  const user = res.locals.user;
  const queryToCreate = {
    text: `INSERT INTO users (github_url, github_followers_url, github_repos_url, name, github_email, github_twitter_username, github_user_id, github_login) 
    VALUES($1, $2, $3, $4, $5, $6, $7, $8)`, //user_is is automatically generated
    values: [
      user.html_url,
      user.followers_url,
      user.repos_url,
      user.name,
      user.email,
      user.twitter_username,
      user.id,
      user.login,
    ],
  };
  db.query(queryToCreate, (err, result) => {
    if (err)
      return next({
        message: 'Error creating user',
        error: err,
      });
    else {
      console.log('User entry worked!--------------------------------');
      res.locals.user = result.rows[0];
      return next();
    }
  });
};

userController.getRepos = (req, res, next) => {
  //fetch request to github_repos_url

  fetch(res.locals.user.github_repos_url,
    {Authorization: `token ${req.cookies.SSID}`

    })
    .then(data => data.json())
    .then(data => {
      const arrOfRepos = data.map(repoObj => {
        return {
          name: repoObj.name,
          stargazersUrl: repoObj.stargazers_url
        };
      });
      res.locals.userWithRepos = {
        user: res.locals.user,
        repos: arrOfRepos
      };

      return next();      
    })
    .catch(err => {
      return next({
        message: 'Error getting repos in userController.getRepos',
        error: err
      });
    });

};



const sampleRepos = [
  'https://api.github.com/repos/angusshire/credit-card-exposure/stargazers',
  'https://api.github.com/repos/angusshire/greenhat/stargazers',
  'https://api.github.com/repos/angusshire/mac-spoofer/stargazers',
  'https://api.github.com/repos/angusshire/memscan/stargazers', 
];
//authtoken for test
const authToken = 'f84ac2bb74b46593d71490af2c46dcc6cc67b578';
userController.getUserInfoFromRepos = (req, res, next) => {
  console.log('req.body.urls===============', req.body);
  let array;
  if (res.locals.userUrls) array = res.locals.userUrls;
  else array = req.body.urls;

  console.log(array);

  //req.body is array of urls
  //each url returns array of objects containing basic userinfo
  //for testing use sampleRepos
  //sampleRepos to be replaced with req.body.repos
  //NEED TO INCLUDE AUTHORIZATION IN ALL FETCH REQUESTS TO PREVENT API TIMING OUT

  const arrayOfFetch = array.map(url => 
    fetch(url,
      //for test use authToken
      //{Authorization: `token ${authToken}`}
      {Authorization: `token ${req.cookies.SSID}`}
    )
      .then(data => data.json())
  );
  Promise.all(arrayOfFetch)

    .then(data => {
      //parse through data and keep only url from each object in array
      res.locals.userUrls = data.flat().map(userinfo => userinfo.url);
      return next();
    })
    .catch(err=> {
      return next({
        message: 'Error resolving multiple promises in userController.getUserInfoFromRepos',
        error: err,
      });
    });
};

const sampleDataMultipleUsers = [
  'https://api.github.com/users/LukeLin',
  'https://api.github.com/users/angusshire',
  'https://api.github.com/users/Ma27',
  'https://api.github.com/users/robobenklein',
  'https://api.github.com/users/sarapowers',
  'https://api.github.com/users/ktrane1'
];
userController.getMultipleUsersInfo = (req, res, next) => {
  let array;
  if (res.locals.userUrls) array = res.locals.userUrls;
  else array = req.body.urls;
  
  const arrayOfFetch = array.map(url => 
    fetch(url,
      //for test use authToken
      //{Authorization: `token ${authToken}`}
      //add Authorization header for actual use
      {Authorization: `token ${req.cookies.SSID}`}
    )
      .then(data => data.json())
  );

  Promise.all(arrayOfFetch)
    .then(data => {
      //data is array of objects
      //remove last element from array => event object
      const listOfUsersAndEmails = data.slice(0, data.length).map(obj =>
      {
        return {
          user: obj.login,
          email: obj.email + 'testEmail'
        };
      });
      res.locals.listOfUsersAndEmails = listOfUsersAndEmails;
      console.log(listOfUsersAndEmails);
      return next();
    });
};

module.exports = userController;
