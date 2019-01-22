import * as chai from 'chai';
import * as firebase from 'firebase/app';

import { GeoFirestore } from '../src/GeoFirestore';
import { GeoQuery } from '../src/GeoQuery';
import {
  afterEachHelper, beforeEachHelper, collection, dummyData,
  firestore, invalidFirestores, stubDatabase, invalidLocations, geocollection, generateDocs
} from './common';

const expect = chai.expect;

describe('GeoQuery Tests:', () => {
  // Reset the Firestore before each test
  beforeEach((done) => {
    beforeEachHelper(done);
  });

  afterEach((done) => {
    afterEachHelper(done);
  });

  describe('Constructor:', () => {
    it('Constructor throws errors given invalid Firestore Query', () => {
      invalidFirestores.forEach((invalidFirestore) => {
        // @ts-ignore
        expect(() => new GeoQuery(invalidFirestore)).to.throw(null, 'Query must be an instance of a Firestore Query');
      });
    });

    it('Constructor does not throw errors given valid Firestore Query', () => {
      expect(() => new GeoQuery(collection)).not.to.throw();
    });
  });

  describe('firestore:', () => {
    it('firestore returns a new GeoFirestore based on a Firestore of GeoQuery', () => {
      expect((new GeoQuery(collection)).firestore).to.deep.equal(new GeoFirestore(firestore));
    });
  });

  describe('onSnapshot:', () => {
    it('onSnapshot returns dummy data, without any geo related filters', (done) => {
      const query = new GeoQuery(collection);
      stubDatabase().then(() => {
        const subscription = query.onSnapshot((snapshot) => {
          if (snapshot.size === dummyData.length) {
            subscription();
            const result = snapshot.docs.map(d => d.data());
            expect(result).to.have.deep.members(dummyData);
            done();
          }
        });
      });
    });

    it('onSnapshot returns dummy data, without any geo related filters and with a `where` statement', (done) => {
      const query = new GeoQuery(collection);
      stubDatabase().then(() => {
        const subscription = query.where('count', '>', 2).onSnapshot((snapshot) => {
          subscription();
          const result = snapshot.docs.map(d => d.data());

          expect(result).to.have.deep.members([
            { key: 'loc4', coordinates: new firebase.firestore.GeoPoint(5, 5), count: 3 },
            { key: 'loc5', coordinates: new firebase.firestore.GeoPoint(67, 55), count: 4 },
            { key: 'loc6', coordinates: new firebase.firestore.GeoPoint(8, 8), count: 5 },
          ]);
          done();
        });
      });
    });

    it('onSnapshot returns dummy data, with geo related filters', (done) => {
      const query = new GeoQuery(collection);
      stubDatabase().then(() => {
        const subscription = query.near({ center: new firebase.firestore.GeoPoint(1, 2), radius: 1000 }).onSnapshot((snapshot) => {
          subscription();
          const result = snapshot.docs.map(d => d.data());
          expect(result).to.have.deep.members([
            { key: 'loc1', coordinates: new firebase.firestore.GeoPoint(2, 3), count: 0 },
            { key: 'loc4', coordinates: new firebase.firestore.GeoPoint(5, 5), count: 3 },
          ]);
          done();
        });
      });
    });

    it('onSnapshot returns no data, with geo related filters on an empty area', (done) => {
      const center = new firebase.firestore.GeoPoint(-50, -50);
      const query = new GeoQuery(collection);
      stubDatabase().then(() => {
        const subscription = query.near({ center, radius: 1 }).onSnapshot((snapshot) => {
          subscription();
          expect(snapshot.empty).to.equal(true);
          done();
        });
      });
    });

    it('onSnapshot updates when a new document, that matches the query, is added to collection', (done) => {
      const center = new firebase.firestore.GeoPoint(-50, -50);
      const doc = geocollection.doc();
      let runOnce = false;
      const query = new GeoQuery(collection);
      stubDatabase().then(() => {
        const subscription = query.near({ center, radius: 1 }).onSnapshot((snapshot) => {
          if (!runOnce) {
            runOnce = true;
            setTimeout(() => {
              doc.set({ coordinates: center });
            }, 100);
          } else {
            subscription();
            const result = snapshot.docs.map(d => d.data());
            expect(result).to.have.deep.members([{ coordinates: center }]);
            done();
          }
        });
      });
    });

    it('onSnapshot updates when a document, that belongs in the query, is removed from collection', (done) => {
      const doc = dummyData[0];
      let runOnce = false;
      const query = new GeoQuery(collection);
      stubDatabase().then(() => {
        const subscription = query.near({ center: doc.coordinates, radius: 0.1 }).onSnapshot((snapshot) => {
          if (!runOnce) {
            runOnce = true;
            expect(snapshot.empty).to.equal(false);
            expect(snapshot.docChanges().length).to.equal(1);
            expect(snapshot.docChanges()[0].type).to.equal('added');
            setTimeout(() => {
              geocollection.doc(doc.key).delete();
            }, 100);
          } else {
            subscription();
            expect(snapshot.empty).to.equal(true);
            expect(snapshot.docChanges().length).to.equal(1);
            expect(snapshot.docChanges()[0].type).to.equal('removed');
            done();
          }
        });
      });
    });

    it('onSnapshot docChanges() returns an array of the \'added\' docs as well as their index and `type`', (done) => {
      const query = new GeoQuery(collection);
      stubDatabase().then(() => {
        const subscription = query.onSnapshot((snapshot) => {
          subscription();
          snapshot.docChanges().forEach((doc, index) => {
            expect(doc.newIndex).to.be.equal(index);
            expect(doc.oldIndex).to.be.equal(-1);
            expect(doc.type).to.be.equal('added');
          });
          done();
        });
      });
    });

    it('onSnapshot docChanges() returns an geofiltered array of the \'added\' docs as well as their index and `type`', (done) => {
      const query = new GeoQuery(collection);
      const generatedData = generateDocs();
      const radius = 100;
      const dummyLimitedData = generatedData.reduce((limited, doc) => {
        if (doc.distance <= radius) {
          limited.push(doc);
        }
        return limited;
      }, []) as any[];
      stubDatabase(generatedData).then(() => {
        const subscription = query.near({ center: new firebase.firestore.GeoPoint(0, 0), radius }).onSnapshot((snapshot) => {
          subscription();
          const docChanges = snapshot.docChanges();
          const docs = docChanges.map(doc => doc.doc.data());
          expect(docChanges.length).to.be.equal(dummyLimitedData.length);
          expect(docs).to.have.deep.members(dummyLimitedData);
          docChanges.forEach((doc, index) => {
            expect(doc.newIndex).to.be.equal(index);
            expect(doc.oldIndex).to.be.equal(-1);
            expect(doc.type).to.be.equal('added');
          });
          done();
        });
      });
    });

    it('onSnapshot returns n amount of documents when a `limit(n)` is applied', (done) => {
      const query = new GeoQuery(collection);
      const n = Math.floor(Math.random() * 99) + 1;
      const generatedData = generateDocs();
      stubDatabase(generatedData).then(() => {
        const subscription = query.limit(n).onSnapshot((snapshot) => {
          subscription();
          expect(snapshot.size).to.be.equal(n);
          done();
        });
      });
    });

    it('onSnapshot returns n amount of geofiltered documents when a `limit(n)` is applied', (done) => {
      const query = new GeoQuery(collection);
      const n = Math.floor(Math.random() * 99) + 1;
      const generatedData = generateDocs();
      const dummyLimitedData = [...generatedData].sort((a, b) => a.distance - b.distance).slice(0, n).sort((a, b) => a.key - b.key);
      stubDatabase(generatedData).then(() => {
        const subscription = query.limit(n).near({ center: new firebase.firestore.GeoPoint(0, 0), radius: 1000 }).onSnapshot((snapshot) => {
          subscription();
          const result = snapshot.docs.map(d => d.data()).sort((a, b) => a.key - b.key);
          expect(snapshot.size).to.be.equal(n);
          expect(result).to.have.deep.members(dummyLimitedData);
          done();
        });
      });
    });
  });

  describe('get():', () => {
    it('get() returns dummy data, without any geo related filters', (done) => {
      const query = new GeoQuery(collection);
      stubDatabase()
        .then(() => query.get())
        .then((data) => {
          const result = data.docs.map(d => d.data());
          expect(result).to.have.deep.members(dummyData);
        })
        .then(done);
    });

    it('get() returns dummy data, without any geo related filters and with a `where` statement', (done) => {
      const query = new GeoQuery(collection);
      stubDatabase().then(() => {
        query.where('count', '>', 2).get().then((snapshot) => {
          const result = snapshot.docs.map(d => d.data());
          expect(result).to.have.deep.members([
            { key: 'loc4', coordinates: new firebase.firestore.GeoPoint(5, 5), count: 3 },
            { key: 'loc5', coordinates: new firebase.firestore.GeoPoint(67, 55), count: 4 },
            { key: 'loc6', coordinates: new firebase.firestore.GeoPoint(8, 8), count: 5 },
          ]);
        }).then(done);
      });
    });

    it('get() returns dummy data, with geo related filters', (done) => {
      const query = new GeoQuery(collection);
      stubDatabase().then(() => {
        query.near({ center: new firebase.firestore.GeoPoint(1, 2), radius: 1000 }).get().then((snapshot) => {
          const result = snapshot.docs.map(d => d.data());
          expect(result).to.have.deep.members([
            { key: 'loc1', coordinates: new firebase.firestore.GeoPoint(2, 3), count: 0 },
            { key: 'loc4', coordinates: new firebase.firestore.GeoPoint(5, 5), count: 3 },
          ]);
        }).then(done);
      });
    });

    it('get() docChanges() returns an array of the \'added\' docs as well as their index and `type`', (done) => {
      const query = new GeoQuery(collection);
      stubDatabase().then(() => {
        query.get().then((snapshot) => {
          const docChanges = snapshot.docChanges();
          const docs = docChanges.map(doc => doc.doc.data());
          expect(docChanges.length).to.be.equal(dummyData.length);
          expect(docs).to.have.deep.members(dummyData);
          docChanges.forEach((doc, index) => {
            expect(doc.newIndex).to.be.equal(index);
            expect(doc.oldIndex).to.be.equal(-1);
            expect(doc.type).to.be.equal('added');
          });
        }).then(done);
      });
    });

    it('get() docChanges() returns an geofiltered array of the \'added\' docs as well as their index and `type`', (done) => {
      const query = new GeoQuery(collection);
      const generatedData = generateDocs();
      const radius = 100;
      const dummyLimitedData = generatedData.reduce((limited, doc) => {
        if ((doc.distance <= radius)) {
          limited.push(doc);
        }
        return limited;
      }, []) as any[];
      stubDatabase(generatedData).then(() => {
        query.near({ center: new firebase.firestore.GeoPoint(0, 0), radius }).get().then((snapshot) => {
          const docChanges = snapshot.docChanges();
          const docs = docChanges.map(doc => doc.doc.data());
          expect(docChanges.length).to.be.equal(dummyLimitedData.length);
          expect(docs).to.have.deep.members(dummyLimitedData);
          docChanges.forEach((doc, index) => {
            expect(doc.newIndex).to.be.equal(index);
            expect(doc.oldIndex).to.be.equal(-1);
            expect(doc.type).to.be.equal('added');
          });
        }).then(done);
      });
    });

    it('get() returns dummy data, when not on web', (done) => {
      const query = new GeoQuery(collection);
      stubDatabase().then(() => {
        query['_isWeb'] = false;
        query.get().then((snapshot) => {
          const result = snapshot.docs.map(d => d.data());
          expect(result).to.have.deep.members(dummyData);
        }).then(done);
      });
    });

    it('get() returns dummy data, with geo related filters, when not on web', (done) => {
      let query = new GeoQuery(collection);
      stubDatabase().then(() => {
        query = query.near({ center: new firebase.firestore.GeoPoint(1, 2), radius: 1000 });
        query['_isWeb'] = false;
        query.get().then((snapshot) => {
          const result = snapshot.docs.map(d => d.data());
          expect(result).to.have.deep.members([
            { key: 'loc1', coordinates: new firebase.firestore.GeoPoint(2, 3), count: 0 },
            { key: 'loc4', coordinates: new firebase.firestore.GeoPoint(5, 5), count: 3 },
          ]);
        }).then(done);
      });
    });

    it('get() returns dummy data from server (web only)', (done) => {
      const query = new GeoQuery(collection);
      stubDatabase().then(() => {
        query.get({ source: 'server' }).then((snapshot) => {
          const result = snapshot.docs.map(d => d.data());
          expect(result).to.have.deep.members(dummyData);
        }).then(done);
      });
    });

    it('get() returns dummy data, with geo related filters from server (web only)', (done) => {
      const query = new GeoQuery(collection);
      stubDatabase().then(() => {
        query.near({ center: new firebase.firestore.GeoPoint(1, 2), radius: 1000 }).get({ source: 'server' }).then((snapshot) => {
          const result = snapshot.docs.map(d => d.data());
          expect(result).to.have.deep.members([
            { key: 'loc1', coordinates: new firebase.firestore.GeoPoint(2, 3), count: 0 },
            { key: 'loc4', coordinates: new firebase.firestore.GeoPoint(5, 5), count: 3 },
          ]);
        }).then(done);
      });
    });

    it('get() returns n amount of documents when a `limit(n)` is applied', (done) => {
      const query = new GeoQuery(collection);
      const n = Math.floor(Math.random() * 99) + 1;
      const generatedData = generateDocs();
      stubDatabase(generatedData).then(() => {
        query.limit(n).get().then((snapshot) => {
          expect(snapshot.size).to.be.equal(n);
        }).then(done);
      });
    });

    it('get() returns n amount of geofiltered documents when a `limit(n)` is applied', (done) => {
      const query = new GeoQuery(collection);
      const n = Math.floor(Math.random() * 99) + 1;
      const generatedData = generateDocs();
      const dummyLimitedData = [...generatedData].sort((a, b) => a.distance - b.distance).slice(0, n);
      stubDatabase(generatedData).then(() => {
        query.limit(n).near({ center: new firebase.firestore.GeoPoint(0, 0), radius: 1000 }).get().then((snapshot) => {
          const result = snapshot.docs.map(d => d.data());
          expect(snapshot.size).to.be.equal(n);
          expect(result).to.have.deep.members(dummyLimitedData);
        }).then(done);
      });
    });
  });

  describe('near():', () => {
    it('near() does not throw an error with valid arguments', () => {
      const query = new GeoQuery(collection);
      expect(() => query.near({ center: new firebase.firestore.GeoPoint(0, 0), radius: 100 })).not.to.throw();
      expect(() => query.near({ center: new firebase.firestore.GeoPoint(1, 1) })).not.to.throw();
      expect(() => query.near({ radius: 500 })).not.to.throw();
    });

    it('near() throws error with no arguments', () => {
      const query = new GeoQuery(collection);
      // @ts-ignore
      expect(() => query.near()).to.throw();
    });

    it('near() throws error with invalid arguments', () => {
      const query = new GeoQuery(collection);
      // @ts-ignore
      expect(() => query.near({})).to.throw();
      invalidLocations.forEach((loc) => {
        // @ts-ignore
        expect(() => query.near({ center: loc, radius: loc })).to.throw();
        // @ts-ignore
        expect(() => query.near({ center: loc })).to.throw();
        // @ts-ignore
        expect(() => query.near({ radius: loc })).to.throw();
      });
    });
  });

  describe('where():', () => {
    it('where() does not throw an error with valid arguments', () => {
      const query = new GeoQuery(collection);
      expect(() => query.where('count', '>', '2')).not.to.throw();
    });

    it('where() throws error with no arguments', () => {
      const query = new GeoQuery(collection);
      // @ts-ignore
      expect(() => query.where()).to.throw();
    });

    it('where() throws error with invalid arguments', () => {
      const query = new GeoQuery(collection);
      // @ts-ignore
      expect(() => query.where('count', 'as', 12)).to.throw();
    });
  });

  describe('limit():', () => {
    it('limit() does not throw an error with valid arguments', () => {
      const query = new GeoQuery(collection);
      [1, 50, 233, 0.9].forEach((limit) => {
        expect(() => query.limit(limit)).not.to.throw();
      });
    });

    it('limit() throws error with no arguments', () => {
      const query = new GeoQuery(collection);
      // @ts-ignore
      expect(() => query.limit()).to.throw();
    });

    it('limit() throws error with invalid arguments', () => {
      const query = new GeoQuery(collection);
      [query, '50', null, () => {}, {}].forEach((limit) => {
        // @ts-ignore
        expect(() => query.limit(limit)).to.throw();
      });
    });
  });

  describe('near().where():', () => {
    it('near().where() does not throw an error with valid arguments', () => {
      const query = new GeoQuery(collection);
      expect(() => query.near({ center: new firebase.firestore.GeoPoint(0, 0), radius: 100 })
                        .where('count', '==', 0)).not.to.throw();
      expect(() => query.near({ center: new firebase.firestore.GeoPoint(1, 1) })
                        .where('count', '>', 0)).not.to.throw();
      expect(() => query.near({ radius: 500 })
                        .where('count', '<=', 0)).not.to.throw();
      expect(() => query.near({ radius: 500 })
                        .where('array', 'array-contains', 'one')).not.to.throw();
    });
  });


  describe('_stringToQuery():', () => {
    it('_stringToQuery() returns an array of two string elements', () => {
      const query = new GeoQuery(collection);
      expect(query['_stringToQuery']('0:z')).to.have.deep.members(['0', 'z']);
    });

    it('_stringToQuery() throws error with invalid argument', () => {
      const query = new GeoQuery(collection);
      // @ts-ignore
      expect(() => query['_stringToQuery']('0z')).to.throw();
    });
  });

  describe('_queryToString():', () => {
    it('_queryToString() returns an array of two string elements', () => {
      const query = new GeoQuery(collection);
      expect(query['_queryToString'](['0', 'z'])).to.equal('0:z');
    });

    it('_queryToString() throws error with invalid argument', () => {
      const query = new GeoQuery(collection);
      // @ts-ignore
      expect(() => query['_queryToString']('0', 'z', 'a')).to.throw();
    });
  });
});
