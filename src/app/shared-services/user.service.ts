import { Injectable } from '@angular/core';
import { Firestore, collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc, DocumentData, getDoc } from '@angular/fire/firestore';
import { User } from '../models/user.class';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})

export class UserService {

    private usersSubject = new BehaviorSubject<User[]>([]);
    users$ = this.usersSubject.asObservable();
    private unsubUsers;

    constructor(private firestore: Firestore) {
        this.unsubUsers = this.subUsersList();
    }

    async createUser(user: User, colId: "users"): Promise<void> {
        const collectionRef = collection(this.firestore, colId);
        try {
            const docRef = await addDoc(collectionRef, user.toJSON());
            user.id = docRef.id;
            this.updateUser(user);
        } catch (error) {
            console.error(error);
            throw error;
        }
    }


    subUsersList() {
        return onSnapshot(this.getUsersRef(), (querySnapshot) => {
          const users = querySnapshot.docs.map((doc) => {
            const data = doc.data() as User;
            return new User({ ...data, id: doc.id });
          });
          this.usersSubject.next(users);
        });
    }

    async deleteUser(colId: string, docId: string) {
        await deleteDoc(this.getSingleDocRef(colId, docId)).catch(
          (error) => {
            console.error(error)
          }
        )
    }

    async updateUser(user: User | null) {
        if (user && user.id) {
          let docRef = this.getSingleDocRef('users', user.id);
          await updateDoc(docRef, user.toJSON()).catch(
            (err) => {
              console.log(err);
            }
          );
        }
    }

    getUsersRef() {
        return collection(this.firestore, 'users');
    }

    getSingleDocRef(coldId: string, docID: string) {
        return doc(collection(this.firestore, coldId), docID)
    }

    ngOnDestroy() {
        this.unsubUsers();
    }

}