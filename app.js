'use strict';

const os = require('os');
const cluster = require('cluster');

const grpc = require('grpc');

const CommonImport = require('./util/CommonImport');

/*
 * Constants define.
 */
global.SERVICE_TAG = process.env.SERVICE_TAG;
global.CONSUL = require('microservice-consul');
global.RELATED_MONGODB_COLLECTIONS = {
  usersCollectionName: 'Users',
  companiesCollectionName: 'Companies'
};

if (cluster.isMaster) {
  /*
   * The master process should be kept as light as it can be, that is: only do the workers management jobs and some others very necessary jobs.
   */

  const workerPortMap = {};

  const numOfWorkers = os.cpus().length;

  for (var i = 0; i < numOfWorkers; i++) {
    const port = 53547 + i;
    const worker = cluster.fork({
      port: port
    });
    workerPortMap['' + worker.process.pid] = port;
  }

  cluster.on('exit', (worker, code, signal) => {
    const oriKey = '' + worker.process.pid;
    const newWorker = cluster.fork({
      port: workerPortMap[oriKey]
    });
    workerPortMap[newWorker.process.pid] = workerPortMap[oriKey];
    delete workerPortMap[oriKey];
  });

} else {

  /*
   * Here the woker process will always be full featured.
   */
  const buildUtilGrpcServer = () => {
    const utilGrpcServer = new grpc.Server();
    const util = grpc.load({root: CommonImport.protos.root, file: CommonImport.protos.util}).microservice.util;
    
    utilGrpcServer.addService(util.Util.service, {
      healthCheck: CommonImport.utils.healthCheck,
      
      checkFieldExistenceV1: require('./api/v1/CheckFieldExistenceImpl').checkFieldExistence,
      generateCsvTplV1: require('./api/v1/GenerateCsvTplImpl').generateCsvTpl
    });

    return utilGrpcServer;
  };

  CommonImport.Promise.join(
    require('microservice-mongodb-conn-pools')(global.CONSUL.keys.mongodbGate).then((dbPools) => {
      return dbPools;
    }),
    CommonImport.utils.pickRandomly(global.CONSUL.agents).kv.get(global.CONSUL.keys['jwtGate']),
    buildUtilGrpcServer(),
    (dbPools, jwtGateOpts, utilGrpcServer) => {
      if (dbPools.length === 0) {
        throw new Error('None of the mongodb servers is available.');
      }
      if (!jwtGateOpts) {
        throw new Error('Invalid gate JWT configurations.');
      }

      global.DB_POOLS = dbPools;
      global.JWT_GATE_OPTS = JSON.parse(jwtGateOpts.Value);
      
      utilGrpcServer.bind('0.0.0.0:' + process.env.port, grpc.ServerCredentials.createInsecure());
      utilGrpcServer.start();
    }
  );

}


