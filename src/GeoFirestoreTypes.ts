/* tslint:disable:no-import-side-effect no-namespace */
import * as FirestoreTypes from '@firebase/firestore-types';
import '@google-cloud/firestore/types/firestore';
import '@types/node';

export namespace GeoFirestoreTypes {
  export interface Document {
    g: string;
    l: web.GeoPoint | cloud.GeoPoint;
    d: DocumentData;
  }
  export type DocumentData = { [field: string]: any } | undefined;
  export interface DocumentChange {
    doc: QueryDocumentSnapshot;
    newIndex: number;
    oldIndex: number;
    type: 'added' | 'modified' | 'removed';
  }
  export interface QueryCriteria {
    center?: cloud.GeoPoint | web.GeoPoint;
    radius?: number;
    limit?: number;
  }
  export interface QueryDocumentSnapshot{
    exists: boolean;
    id: string;
    data: (options?: GeoFirestoreTypes.SnapshotOptions) => DocumentData | undefined;
    get(fieldPath:  string |
                    GeoFirestoreTypes.cloud.FieldPath |
                    GeoFirestoreTypes.web.FieldPath,
        options:    GeoFirestoreTypes.SnapshotOptions
    ): any;
    isEqual(other:  GeoFirestoreTypes.cloud.DocumentSnapshot |
                    GeoFirestoreTypes.web.DocumentSnapshot
    ): boolean;
    distance: number;
    ref: any;

  }

  export interface SetOptions {
    customKey?: string;
    merge?: boolean;
    mergeFields?: Array<string | cloud.FieldPath | web.FieldPath>;
  }
  export type SnapshotOptions = FirestoreTypes.SnapshotOptions;
  export interface UpdateData { [fieldPath: string]: any; }
  export type WhereFilterOp = '<' | '<=' | '==' | '>=' | '>' | 'array-contains';
  export namespace web {
    export type CollectionReference = FirestoreTypes.CollectionReference;
    export type DocumentChange = FirestoreTypes.DocumentChange;
    export type DocumentReference = FirestoreTypes.DocumentReference;
    export type DocumentSnapshot = FirestoreTypes.DocumentSnapshot;
    export type Firestore = FirestoreTypes.FirebaseFirestore;
    export type FieldPath = FirestoreTypes.FieldPath;
    export type GetOptions = FirestoreTypes.GetOptions;
    export type GeoPoint = FirestoreTypes.GeoPoint;
    export type Query = FirestoreTypes.Query;
    export type QuerySnapshot = FirestoreTypes.QuerySnapshot;
    export type QueryDocumentSnapshot = FirestoreTypes.QueryDocumentSnapshot;
    export type WriteBatch = FirestoreTypes.WriteBatch;
  }
  export namespace cloud {
    export type CollectionReference = FirebaseFirestore.CollectionReference;
    export type DocumentChange = FirebaseFirestore.DocumentChange;
    export type DocumentReference = FirebaseFirestore.DocumentReference;
    export type DocumentSnapshot = FirebaseFirestore.DocumentSnapshot;
    export type Firestore = FirebaseFirestore.Firestore;
    export type FieldPath = FirebaseFirestore.FieldPath;
    export type GeoPoint = FirebaseFirestore.GeoPoint;
    export type Query = FirebaseFirestore.Query;
    export type QuerySnapshot = FirebaseFirestore.QuerySnapshot;
    export type QueryDocumentSnapshot = FirebaseFirestore.QueryDocumentSnapshot;
    export type WriteBatch = FirebaseFirestore.WriteBatch;
  }
}