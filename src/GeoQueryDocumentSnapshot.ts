import { GeoFirestoreTypes } from './GeoFirestoreTypes';
import { GeoDocumentSnapshot } from "./GeoDocumentSnapshot";
import { calculateDistance, validateGeoDocument } from "./utils";

export class GeoQueryDocumentSnapshot extends GeoDocumentSnapshot {
    /**
     * @param _queryDocumentSnapshot The `QueryDocumentSnapshot` instance.
     * @param _center The `Geopoint` center
     */
    private _center: GeoFirestoreTypes.cloud.GeoPoint | GeoFirestoreTypes.web.GeoPoint;
    private _data: GeoFirestoreTypes.DocumentData;

    constructor(private _queryDocumentSnapshot:
        GeoFirestoreTypes.web.QueryDocumentSnapshot |
        GeoFirestoreTypes.cloud.QueryDocumentSnapshot,
        _center?: GeoFirestoreTypes.web.GeoPoint | GeoFirestoreTypes.cloud.GeoPoint) {
        super(_queryDocumentSnapshot);
        this._data = this._queryDocumentSnapshot.data();
    }


    private getDoc(doc): GeoFirestoreTypes.Document {
        return doc;
    }

    get distance() : any {
        if (validateGeoDocument(this.getDoc(this._data), true)) {
            return (this._center) ? {distance : calculateDistance(this._data.l, this._center)} : null;
        }
        return null;
    }

    get doc() : any{
        return {
            ...this.distance,
            ...super.data()
        };
    }

    public data(): any {
        return {
            exists: this._queryDocumentSnapshot.exists,
            id: this._queryDocumentSnapshot.id,
            ...this.doc
        };
    }
}