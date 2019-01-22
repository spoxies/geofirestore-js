import * as chai from 'chai';
import * as firebase from 'firebase/app';
import 'firebase/firestore';

import {
  boundingBoxBits, boundingBoxCoordinates, calculateDistance, decodeGeoDocumentData, decodeGeoQueryDocumentSnapshotData, degreesToRadians,
  encodeGeohash, encodeGeoDocument, encodeSetDocument, encodeUpdateDocument, findCoordinatesKey, generateGeoQueryDocumentSnapshot,
  geohashQueries, GEOHASH_PRECISION, geohashQuery, latitudeBitsForResolution, log2, longitudeBitsForResolution, metersToLongitudeDegrees,
  toGeoPoint, validateGeoDocument, validateGeohash, validateLimit, validateLocation, validateQueryCriteria, wrapLongitude
} from '../src/utils';
import {
  invalidGeoFirestoreDocuments, invalidGeohashes, invalidLocations, invalidQueryCriterias, validGeoFirestoreDocuments, validGeohashes,
  validLocations, validQueryCriterias, dummyData
} from './common';

const expect = chai.expect;

describe('Utils Tests:', () => {
  describe('Bounding box bits:', () => {
    it('boundingBoxBits() must return correct number of bits', () => {
      expect(boundingBoxBits(new firebase.firestore.GeoPoint(35, 0), 1000)).to.be.equal(28);
      expect(boundingBoxBits(new firebase.firestore.GeoPoint(35.645, 0), 1000)).to.be.equal(27);
      expect(boundingBoxBits(new firebase.firestore.GeoPoint(36, 0), 1000)).to.be.equal(27);
      expect(boundingBoxBits(new firebase.firestore.GeoPoint(0, 0), 1000)).to.be.equal(28);
      expect(boundingBoxBits(new firebase.firestore.GeoPoint(0, -180), 1000)).to.be.equal(28);
      expect(boundingBoxBits(new firebase.firestore.GeoPoint(0, 180), 1000)).to.be.equal(28);
      expect(boundingBoxBits(new firebase.firestore.GeoPoint(0, 0), 8000)).to.be.equal(22);
      expect(boundingBoxBits(new firebase.firestore.GeoPoint(45, 0), 1000)).to.be.equal(27);
      expect(boundingBoxBits(new firebase.firestore.GeoPoint(75, 0), 1000)).to.be.equal(25);
      expect(boundingBoxBits(new firebase.firestore.GeoPoint(75, 0), 2000)).to.be.equal(23);
      expect(boundingBoxBits(new firebase.firestore.GeoPoint(90, 0), 1000)).to.be.equal(1);
      expect(boundingBoxBits(new firebase.firestore.GeoPoint(90, 0), 2000)).to.be.equal(1);
    });
  });

  describe('Bounding box coordinates:', () => {
    it('boundingBoxCoordinates() must return correct set of coordinates', () => {
      expect(boundingBoxCoordinates(new firebase.firestore.GeoPoint(41.3083, -72.9279), 1000)).to.have.deep.members([
        toGeoPoint(41.3083, -72.9279),
        toGeoPoint(41.3083, -72.93984310002693),
        toGeoPoint(41.3083, -72.91595689997305),
        toGeoPoint(41.31734371732957, -72.9279),
        toGeoPoint(41.31734371732957, -72.93984310002693),
        toGeoPoint(41.31734371732957, -72.91595689997305),
        toGeoPoint(41.299256282670434, -72.9279),
        toGeoPoint(41.299256282670434, -72.93984310002693),
        toGeoPoint(41.299256282670434, -72.91595689997305),
      ]);
    });
  });

  describe('Calculate distance:', () => {
    it('calculateDistance() calculates the distance between locations', () => {
      expect(calculateDistance(
        new firebase.firestore.GeoPoint(90, 180),
        new firebase.firestore.GeoPoint(90, 180))
      ).to.be.closeTo(0, 0);
      expect(calculateDistance(
        new firebase.firestore.GeoPoint(-90, -180),
        new firebase.firestore.GeoPoint(90, 180))
      ).to.be.closeTo(20015, 1);
      expect(calculateDistance(
        new firebase.firestore.GeoPoint(-90, -180),
        new firebase.firestore.GeoPoint(-90, 180))
      ).to.be.closeTo(0, 1);
      expect(calculateDistance(
        new firebase.firestore.GeoPoint(-90, -180),
        new firebase.firestore.GeoPoint(90, -180))
      ).to.be.closeTo(20015, 1);
      expect(calculateDistance(
        new firebase.firestore.GeoPoint(37.7853074, -122.4054274),
        new firebase.firestore.GeoPoint(78.216667, 15.55))
      ).to.be.closeTo(6818, 1);
      expect(calculateDistance(
        new firebase.firestore.GeoPoint(38.98719, -77.250783),
        new firebase.firestore.GeoPoint(29.3760648, 47.9818853))
      ).to.be.closeTo(10531, 1);
      expect(calculateDistance(
        new firebase.firestore.GeoPoint(38.98719, -77.250783),
        new firebase.firestore.GeoPoint(-54.933333, -67.616667))
      ).to.be.closeTo(10484, 1);
      expect(calculateDistance(
        new firebase.firestore.GeoPoint(29.3760648, 47.9818853),
        new firebase.firestore.GeoPoint(-54.933333, -67.616667))
      ).to.be.closeTo(14250, 1);
      expect(calculateDistance(
        new firebase.firestore.GeoPoint(-54.933333, -67.616667),
        new firebase.firestore.GeoPoint(-54, -67))
      ).to.be.closeTo(111, 1);
    });

    it('calculateDistance() does not throw errors given valid locations', () => {
      validLocations.forEach((validLocation) => {
        expect(() => calculateDistance(validLocation, new firebase.firestore.GeoPoint(0, 0))).not.to.throw();
        expect(() => calculateDistance(new firebase.firestore.GeoPoint(0, 0), validLocation)).not.to.throw();
      });
    });

    it('calculateDistance() throws errors given invalid locations', () => {
      invalidLocations.forEach((invalidLocation) => {
        // @ts-ignore
        expect(() => calculateDistance(invalidLocation, [0, 0])).to.throw();
        // @ts-ignore
        expect(() => calculateDistance([0, 0], invalidLocation)).to.throw();
      });
    });
  });

  describe('Decodes GeoDocument data:', () => {
    it('decodeGeoDocumentData() returns decoded document given valid data', () => {
      validGeoFirestoreDocuments.forEach((doc) => {
        expect(decodeGeoDocumentData(doc)).to.deep.equal(doc.d);
      });
    });

    it('decodeGeoDocumentData() returns original document given invalid data', () => {
      dummyData.forEach((doc) => {
        // @ts-ignore
        expect(decodeGeoDocumentData(doc)).to.deep.equal(doc);
      });
    });
  });

  describe('Decodes GeoQueryDocumentSnapshot data:', () => {
    it('decodeGeoQueryDocumentSnapshotData() returns decoded document with no distance given valid data and no center', () => {
      validGeoFirestoreDocuments.forEach((doc) => {
        const decoded = decodeGeoQueryDocumentSnapshotData(doc);
        expect(decoded.data()).to.deep.equal(doc.d);
        expect(decoded.distance).to.equal(null);
      });
    });

    it('decodeGeoQueryDocumentSnapshotData() returns decoded document with distance given valid data and center', () => {
      validGeoFirestoreDocuments.forEach((doc) => {
        const center = new firebase.firestore.GeoPoint(0, 0);
        const decoded = decodeGeoQueryDocumentSnapshotData(doc, center);
        const distance = calculateDistance(doc.l, center);
        expect(decoded.data()).to.deep.equal(doc.d);
        expect(decoded.distance).to.be.equal(distance);
      });
    });

    it('decodeGeoQueryDocumentSnapshotData() returns original document and no distance given invalid data and no center', () => {
      dummyData.forEach((doc) => {
        // @ts-ignore
        const decoded = decodeGeoQueryDocumentSnapshotData(doc);
        expect(decoded.data()).to.deep.equal(doc);
        expect(decoded.distance).to.equal(null);
      });
    });
  });

  describe('Degrees to radians:', () => {
    it('degreesToRadians() converts degrees to radians', () => {
      expect(degreesToRadians(0)).to.be.closeTo(0, 0);
      expect(degreesToRadians(45)).to.be.closeTo(0.7854, 4);
      expect(degreesToRadians(90)).to.be.closeTo(1.5708, 4);
      expect(degreesToRadians(135)).to.be.closeTo(2.3562, 4);
      expect(degreesToRadians(180)).to.be.closeTo(3.1416, 4);
      expect(degreesToRadians(225)).to.be.closeTo(3.9270, 4);
      expect(degreesToRadians(270)).to.be.closeTo(4.7124, 4);
      expect(degreesToRadians(315)).to.be.closeTo(5.4978, 4);
      expect(degreesToRadians(360)).to.be.closeTo(6.2832, 4);
      expect(degreesToRadians(-45)).to.be.closeTo(-0.7854, 4);
      expect(degreesToRadians(-90)).to.be.closeTo(-1.5708, 4);
    });

    it('degreesToRadians() throws errors given invalid inputs', () => {
      // @ts-ignore
      expect(() => degreesToRadians('')).to.throw();
      // @ts-ignore
      expect(() => degreesToRadians('a')).to.throw();
      // @ts-ignore
      expect(() => degreesToRadians(true)).to.throw();
      // @ts-ignore
      expect(() => degreesToRadians(false)).to.throw();
      // @ts-ignore
      expect(() => degreesToRadians([1])).to.throw();
      // @ts-ignore
      expect(() => degreesToRadians({})).to.throw();
      expect(() => degreesToRadians(null)).to.throw();
      expect(() => degreesToRadians(undefined)).to.throw();
    });
  });

  describe('Encode geohash:', () => {
    it('encodeGeohash() encodes locations to geohashes given no precision', () => {
      expect(encodeGeohash(new firebase.firestore.GeoPoint(-90, -180))).to.be.equal('0000000000'.slice(0, GEOHASH_PRECISION));
      expect(encodeGeohash(new firebase.firestore.GeoPoint(90, 180))).to.be.equal('zzzzzzzzzzzz'.slice(0, GEOHASH_PRECISION));
      expect(encodeGeohash(new firebase.firestore.GeoPoint(-90, 180))).to.be.equal('pbpbpbpbpbpb'.slice(0, GEOHASH_PRECISION));
      expect(encodeGeohash(new firebase.firestore.GeoPoint(90, -180))).to.be.equal('bpbpbpbpbpbp'.slice(0, GEOHASH_PRECISION));
      expect(encodeGeohash(
        new firebase.firestore.GeoPoint(37.7853074, -122.4054274))
      ).to.be.equal('9q8yywe56gcf'.slice(0, GEOHASH_PRECISION));
      expect(encodeGeohash(new firebase.firestore.GeoPoint(38.98719, -77.250783))).to.be.equal('dqcjf17sy6cp'.slice(0, GEOHASH_PRECISION));
      expect(encodeGeohash(
        new firebase.firestore.GeoPoint(29.3760648, 47.9818853))
      ).to.be.equal('tj4p5gerfzqu'.slice(0, GEOHASH_PRECISION));
      expect(encodeGeohash(new firebase.firestore.GeoPoint(78.216667, 15.55))).to.be.equal('umghcygjj782'.slice(0, GEOHASH_PRECISION));
      expect(encodeGeohash(
        new firebase.firestore.GeoPoint(-54.933333, -67.616667))
      ).to.be.equal('4qpzmren1kwb'.slice(0, GEOHASH_PRECISION));
      expect(encodeGeohash(new firebase.firestore.GeoPoint(-54, -67))).to.be.equal('4w2kg3s54y7h'.slice(0, GEOHASH_PRECISION));
    });

    it('encodeGeohash() encodes locations to geohashes given a custom precision', () => {
      expect(encodeGeohash(new firebase.firestore.GeoPoint(-90, -180), 6)).to.be.equal('000000');
      expect(encodeGeohash(new firebase.firestore.GeoPoint(90, 180), 20)).to.be.equal('zzzzzzzzzzzzzzzzzzzz');
      expect(encodeGeohash(new firebase.firestore.GeoPoint(-90, 180), 1)).to.be.equal('p');
      expect(encodeGeohash(new firebase.firestore.GeoPoint(90, -180), 5)).to.be.equal('bpbpb');
      expect(encodeGeohash(new firebase.firestore.GeoPoint(37.7853074, -122.4054274), 8)).to.be.equal('9q8yywe5');
      expect(encodeGeohash(new firebase.firestore.GeoPoint(38.98719, -77.250783), 18)).to.be.equal('dqcjf17sy6cppp8vfn');
      expect(encodeGeohash(new firebase.firestore.GeoPoint(29.3760648, 47.9818853), 12)).to.be.equal('tj4p5gerfzqu');
      expect(encodeGeohash(new firebase.firestore.GeoPoint(78.216667, 15.55), 1)).to.be.equal('u');
      expect(encodeGeohash(new firebase.firestore.GeoPoint(-54.933333, -67.616667), 7)).to.be.equal('4qpzmre');
      expect(encodeGeohash(new firebase.firestore.GeoPoint(-54, -67), 9)).to.be.equal('4w2kg3s54');
    });

    it('encodeGeohash() does not throw errors given valid locations', () => {
      validLocations.forEach((validLocation, i) => {
        expect(() => encodeGeohash(validLocation)).not.to.throw();
      });
    });

    it('encodeGeohash() throws errors given invalid locations', () => {
      invalidLocations.forEach((invalidLocation, i) => {
        // @ts-ignore
        expect(() => encodeGeohash(invalidLocation)).to.throw();
      });
    });

    it('encodeGeohash() does not throw errors given valid precision', () => {
      const validPrecisions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, undefined];

      validPrecisions.forEach((validPrecision, i) => {
        expect(() => encodeGeohash(new firebase.firestore.GeoPoint(0, 0), validPrecision)).not.to.throw();
      });
    });

    it('encodeGeohash() throws errors given invalid precision', () => {
      const invalidPrecisions = [0, -1, 1.5, 23, '', 'a', true, false, [], {}, [1], { a: 1 }, null];

      invalidPrecisions.forEach((invalidPrecision, i) => {
        // @ts-ignore
        expect(() => encodeGeohash(new firebase.firestore.GeoPoint(0, 0), invalidPrecision)).to.throw();
      });
    });
  });

  describe('Encode GeoDocument:', () => {
    it('encodeGeoDocument() encodes locations to geohashes given no precision', () => {
      dummyData.forEach((data) => {
        const g = encodeGeohash(data.coordinates);
        const doc = { g, l: data.coordinates, d: data };
        expect(encodeGeoDocument(data.coordinates, g, data)).to.deep.equal(doc);
      });
    });
  });

  describe('Parameter validation:', () => {
    it('validateLocation() does not throw errors given valid locations', () => {
      validLocations.forEach((validLocation, i) => {
        expect(() => validateLocation(validLocation)).not.to.throw();
      });
    });

    it('validateLocation() throws errors given invalid locations', () => {
      invalidLocations.forEach((invalidLocation, i) => {
        // @ts-ignore
        expect(() => validateLocation(invalidLocation)).to.throw();
      });
    });

    it('validateGeohash() does not throw errors given valid geohashes', () => {
      validGeohashes.forEach((validGeohash, i) => {
        expect(() => validateGeohash(validGeohash)).not.to.throw();
      });
    });

    it('validateGeohash() throws errors given invalid geohashes', () => {
      invalidGeohashes.forEach((invalidGeohash, i) => {
        // @ts-ignore
        expect(() => validateGeohash(invalidGeohash)).to.throw();
      });
    });

    it('validateCriteria(criteria, true) does not throw errors given valid query criteria', () => {
      validQueryCriterias.forEach((validQueryCriteria) => {
        if (typeof validQueryCriteria.center !== 'undefined' && typeof validQueryCriteria.radius !== 'undefined') {
          expect(() => validateQueryCriteria(validQueryCriteria, true)).not.to.throw();
        }
      });
    });

    it('validateCriteria(criteria) does not throw errors given valid query criteria', () => {
      validQueryCriterias.forEach((validQueryCriteria) => {
        expect(() => validateQueryCriteria(validQueryCriteria)).not.to.throw();
      });
    });

    it('validateCriteria(criteria, true) throws errors given invalid query criteria', () => {
      invalidQueryCriterias.forEach((invalidQueryCriteria) => {
        // @ts-ignore
        expect(() => validateQueryCriteria(invalidQueryCriteria, true)).to.throw();
      });
      expect(() => validateQueryCriteria({ center: new firebase.firestore.GeoPoint(0, 0) }, true)).to.throw();
      expect(() => validateQueryCriteria({ radius: 1000 }, true)).to.throw();
    });

    it('validateCriteria(criteria) throws errors given invalid query criteria', () => {
      invalidQueryCriterias.forEach((invalidQueryCriteria) => {
        // @ts-ignore
        expect(() => validateQueryCriteria(invalidQueryCriteria)).to.throw();
      });

      it('validateGeoFirestoreObject() does not throw errors given valid GeoFirestoreObj', () => {
        validGeoFirestoreDocuments.forEach((validGeoFirestoreObject) => {
          expect(() => validateGeoDocument(validGeoFirestoreObject)).not.to.throw();
        });
      });

      it('validateGeoFirestoreObject() returns true given valid GeoFirestoreObj with flag enabled', () => {
        validGeoFirestoreDocuments.forEach((validGeoFirestoreObject) => {
          expect(() => validateGeoDocument(validGeoFirestoreObject, true)).to.be.equal(true);
        });
      });

      it('validateGeoFirestoreObject() throws errors given invalid GeoFirestoreObj', () => {
        invalidGeoFirestoreDocuments.forEach((invalidGeoFirestoreObject) => {
          // @ts-ignore
          expect(() => validateGeoDocument(invalidGeoFirestoreObject)).to.throw();
        });
      });

      it('validateGeoFirestoreObject() returns false given invalid GeoFirestoreObj with flag enabled', () => {
        invalidGeoFirestoreDocuments.forEach((invalidGeoFirestoreObject) => {
          // @ts-ignore
          expect(() => validateGeoDocument(invalidGeoFirestoreObject, true)).to.throw();
        });
      });
    });
  });



  describe('GeoPoint Generation:', () => {
    it('toGeoPoint() does not throw errors given valid coordinates', () => {
      validLocations.forEach((validLocation) => {
        expect(() => toGeoPoint(validLocation.latitude, validLocation.latitude)).not.to.throw();
      });
    });

    it('toGeoPoint() throws errors given invalid coordinates', () => {
      invalidLocations.forEach((invalidLocation) => {
        // @ts-ignore
        expect(() => toGeoPoint((invalidLocation.latitude || 900), (invalidLocation.latitude || 900))).to.throw();
      });
    });
  });

  describe('Coordinate calculations:', () => {
    it('metersToLongtitudeDegrees calculates correctly', () => {
      expect(metersToLongitudeDegrees(1000, 0)).to.be.closeTo(0.008983, 5);
      expect(metersToLongitudeDegrees(111320, 0)).to.be.closeTo(1, 5);
      expect(metersToLongitudeDegrees(107550, 15)).to.be.closeTo(1, 5);
      expect(metersToLongitudeDegrees(96486, 30)).to.be.closeTo(1, 5);
      expect(metersToLongitudeDegrees(78847, 45)).to.be.closeTo(1, 5);
      expect(metersToLongitudeDegrees(55800, 60)).to.be.closeTo(1, 5);
      expect(metersToLongitudeDegrees(28902, 75)).to.be.closeTo(1, 5);
      expect(metersToLongitudeDegrees(0, 90)).to.be.closeTo(0, 5);
      expect(metersToLongitudeDegrees(1000, 90)).to.be.closeTo(360, 5);
      expect(metersToLongitudeDegrees(1000, 89.9999)).to.be.closeTo(360, 5);
      expect(metersToLongitudeDegrees(1000, 89.995)).to.be.closeTo(102.594208, 5);
    });

    it('wrapLongitude wraps correctly', () => {
      expect(wrapLongitude(0)).to.be.closeTo(0, 6);
      expect(wrapLongitude(180)).to.be.closeTo(180, 6);
      expect(wrapLongitude(-180)).to.be.closeTo(-180, 6);
      expect(wrapLongitude(182)).to.be.closeTo(-178, 6);
      expect(wrapLongitude(270)).to.be.closeTo(-90, 6);
      expect(wrapLongitude(360)).to.be.closeTo(0, 6);
      expect(wrapLongitude(540)).to.be.closeTo(-180, 6);
      expect(wrapLongitude(630)).to.be.closeTo(-90, 6);
      expect(wrapLongitude(720)).to.be.closeTo(0, 6);
      expect(wrapLongitude(810)).to.be.closeTo(90, 6);
      expect(wrapLongitude(-360)).to.be.closeTo(0, 6);
      expect(wrapLongitude(-182)).to.be.closeTo(178, 6);
      expect(wrapLongitude(-270)).to.be.closeTo(90, 6);
      expect(wrapLongitude(-360)).to.be.closeTo(0, 6);
      expect(wrapLongitude(-450)).to.be.closeTo(-90, 6);
      expect(wrapLongitude(-540)).to.be.closeTo(180, 6);
      expect(wrapLongitude(-630)).to.be.closeTo(90, 6);
      expect(wrapLongitude(1080)).to.be.closeTo(0, 6);
      expect(wrapLongitude(-1080)).to.be.closeTo(0, 6);
    });
  });

  describe('Geohash queries:', () => {
    it('Geohash queries must be of the right size', () => {
      expect(geohashQuery('64m9yn96mx', 6)).to.be.deep.equal(['60', '6h']);
      expect(geohashQuery('64m9yn96mx', 1)).to.be.deep.equal(['0', 'h']);
      expect(geohashQuery('64m9yn96mx', 10)).to.be.deep.equal(['64', '65']);
      expect(geohashQuery('6409yn96mx', 11)).to.be.deep.equal(['640', '64h']);
      expect(geohashQuery('64m9yn96mx', 11)).to.be.deep.equal(['64h', '64~']);
      expect(geohashQuery('6', 10)).to.be.deep.equal(['6', '6~']);
      expect(geohashQuery('64z178', 12)).to.be.deep.equal(['64s', '64~']);
      expect(geohashQuery('64z178', 15)).to.be.deep.equal(['64z', '64~']);
    });

    it('Queries from geohashQueries must contain points in circle', () => {
      function inQuery(queries, hash) {
        for (let i = 0; i < queries.length; i++) {
          if (hash >= queries[i][0] && hash < queries[i][1]) {
            return true;
          }
        }
        return false;
      }
      for (let i = 0; i < 200; i++) {
        const centerLat = Math.pow(Math.random(), 5) * 160 - 80;
        const centerLong = Math.pow(Math.random(), 5) * 360 - 180;
        const radius = Math.random() * Math.random() * 100000;
        const degreeRadius = metersToLongitudeDegrees(radius, centerLat);
        const queries = geohashQueries(new firebase.firestore.GeoPoint(centerLat, centerLong), radius);
        for (let j = 0; j < 1000; j++) {
          const pointLat = Math.max(-89.9, Math.min(89.9, centerLat + Math.random() * degreeRadius));
          const pointLong = wrapLongitude(centerLong + Math.random() * degreeRadius);
          if (calculateDistance(
            new firebase.firestore.GeoPoint(centerLat, centerLong),
            new firebase.firestore.GeoPoint(pointLat, pointLong)
          ) < radius / 1000) {
            expect(inQuery(queries, encodeGeohash(new firebase.firestore.GeoPoint(pointLat, pointLong)))).to.be.equal(true);
          }
        }
      }
    });
  });

  describe('Other: ', () => {
    it('validateLimit() returns `true` if a number (not less than 0) is inputted', () => {
      [0, 0.1, 1, 500, 30].forEach((n) => {
        expect(validateLimit(n)).to.be.equal(true);
      });
    });

    it('validateLimit() throws an error if a number less than 0 is inputted', () => {
      [-0.1, -1, -500, -30].forEach((n) => {
        expect(() => validateLimit(n)).to.throw();
      });
    });

    it('validateLimit() returns `false` if a number less than 0 is inputted and the suppress error flag is enabled', () => {
      [-0.1, -1, -500, -30].forEach((n) => {
        expect(validateLimit(n, true)).to.be.equal(false);
      });
    });

    it('validateLimit() throws an error given an invalid argument', () => {
      [it, '50', null, () => {}, {}].forEach((n) => {
        // @ts-ignore
        expect(() => validateLimit(n)).to.throw();
      });
    });

    it('validateLimit() throws error with no arguments', () => {
      // @ts-ignore
      expect(() => validateLimit()).to.throw();
    });
  });
});
