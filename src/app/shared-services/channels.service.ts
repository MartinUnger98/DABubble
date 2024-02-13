import { Injectable } from '@angular/core';
import { Firestore, collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc, getDocs, query, where, writeBatch, getDoc } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { Channel } from '../models/channel.class';
import { BehaviorSubject, map, take } from 'rxjs';
import { formatDate } from '@angular/common';
import { Message } from '../models/message.class';
import { User } from '../models/user.class';
import { DataService } from './data.service';
@Injectable({
  providedIn: 'root'
})
export class ChannelsService {

  public channels$: BehaviorSubject<Channel[]> = new BehaviorSubject<Channel[]>([]);
  public selectedChannel$: BehaviorSubject<Channel | null> = new BehaviorSubject<Channel | null>(null);
  public currentUserInfo$: BehaviorSubject<User> = new BehaviorSubject<User>(null!);
  public messagesInChannels$: BehaviorSubject<Message[]> = new BehaviorSubject<Message[]>([]);
  private messageChannelMap = new Map<string, Channel>();

  private unsubChannels;
  private isNewChannelCreated = false;

  constructor(private firestore: Firestore,
    private auth: Auth,
    private dataService: DataService
  ) {
    this.unsubChannels = this.subChannelsList();
  }


  subChannelsList() {
    return onSnapshot(this.getChannelsRef(), (querySnapshot) => {
      let channels = querySnapshot.docs.map((doc) => {
        const data = doc.data() as Channel;
        return new Channel({ ...data, id: doc.id });
      });
      channels = this.filterChannelsBasedOnUserType(channels);
      this.channels$.next(channels);
      if (!this.isNewChannelCreated) {
        this.findNextAvailableChannel();
      }
    });
  }


  async createChannel(channel: Channel, colId: 'channels'): Promise<void> {
    const collectionRef = collection(this.firestore, colId);
    channel.timestamp = formatDate(new Date(), 'dd-MM-yyyy HH:mm', 'en-US');
    try {
      const docRef = await addDoc(collectionRef, channel.toJSON());
      channel.id = docRef.id;
      this.updateChannel(channel);
      this.isNewChannelCreated = true;
      this.closeNewMessageInput()
      this.setSelectedChannel(channel);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }


  findNextAvailableChannel(): void {
    this.channels$.pipe(
      take(1),
      map(channels => channels.find(channel =>
        channel.members.some(member => member.id === this.currentUserInfo$.value?.id)) ?? null
      )
    ).subscribe(firstChannelWithmembership => {
      let counter = 0;
      const intervalId = setInterval(() => {
        this.setSelectedChannelWithFirstMembership(firstChannelWithmembership);
        counter++;
        if (counter === 2) {
          clearInterval(intervalId);
        }
      }, 100);
    });
    this.isNewChannelCreated = false;
  }


  setSelectedChannelWithFirstMembership(channel: Channel | null) {
    if (channel) {
      this.setSelectedChannel(channel);
      this.closeNewMessageInput();
    } else {
      this.openNewMessageInput();
    }
  }


  async refreshMessagesInAccessibleChannels() {
    let allMessages: Message[] = [];
    const accessibleChannels = this.channels$.value.filter(channel =>
      this.isCurrentUserChannelMember(channel)
    );
    for (const channel of accessibleChannels) {
      const messages = await this.getMessagesToFindChannel(channel);
      messages.forEach(message => this.messageChannelMap.set(message.id, channel));
      allMessages = [...allMessages, ...messages];
    }
    this.messagesInChannels$.next(allMessages);
  }


  async updateUserNameInAllMessages(userId: string, newName: string, newAvatar: string) {
    const channels = this.channels$.value;
    for (const channel of channels) {
      const messagesRef = this.getChannelsColRef(channel);
      const querySnapshot = await getDocs(messagesRef);
      querySnapshot.forEach(async (doc) => {
        const message = doc.data() as Message;
        if (message.creatorId === userId) {
          const updatedMessage = { ...message, creator: newName, avatar: newAvatar };
          await updateDoc(doc.ref, updatedMessage);
        }
      });
    }
  }


  filterChannelsBasedOnUserType(channels: Channel[]): Channel[] {
    const currentUser = this.auth.currentUser?.uid;
    if (!currentUser) {
      return [];
    }
    const filteredChannels = channels.filter(channel =>
      channel.members.some(member => member.id === currentUser)
    );
    if (filteredChannels.length === 0) {
      this.openNewMessageInput();
    } else {
      this.closeNewMessageInput();
    }
    return filteredChannels;
  }


  async refreshChannelsAfterEditingProfile() {
    const querySnapshot = await getDocs(this.getChannelsRef());
    const selectedChannel = this.selectedChannel$.getValue();
    const currentUser = this.currentUserInfo$.value;
    let channels = querySnapshot.docs.map((doc) => {
      const data = doc.data() as Channel;
      return new Channel({ ...data, id: doc.id });
    });
    channels = channels.filter(channel =>
      channel.members.some(member => member.id === currentUser.id)
    );
    this.channels$.next(channels);
    this.selectedChannel$.next(selectedChannel);
  }


  async deleteGuestMessages(): Promise<void> {
    const demoChannelId = 'aDusoQEpfWO6oWyth9fE';
    const messagesRef = collection(this.firestore, `channels/${demoChannelId}/messages`);
    const querySnapshot = await getDocs(messagesRef);
    const batch = writeBatch(this.firestore);
    querySnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  }


  async updateChannel(channel: Channel | null) {
    if (channel && channel.id) {
      this.isNewChannelCreated = true;
      let docRef = this.getSingleDocRef('channels', channel.id);
      await updateDoc(docRef, channel.toJSON()).catch(
        (err) => {
          console.error(err);
        }
      );
    }
  }


  async deleteChannel(channel: Channel | null) {
    if (channel && channel.id) {
      const docRef = this.getSingleDocRef('channels', channel.id);
      await deleteDoc(docRef).catch((error) => {
        console.error(error);
      });
    }
  }


  openNewMessageInput() {
    this.dataService.new_message_open$.next(true);
    this.dataService.thread_open$.next(false);
    this.dataService.directmessage_open$.next(false);
  }


  closeNewMessageInput() {
    this.dataService.new_message_open$.next(false);
    this.dataService.thread_open$.next(false);
    this.dataService.directmessage_open$.next(false);
  }

  
  setSelectedChannel(channel: Channel): void {
    this.selectedChannel$.next(channel);
  }


  isCurrentUserChannelMember(channel: Channel): boolean {
    const currentUser = this.currentUserInfo$.value;
    return channel.members.some(member => member.id === currentUser.id);
  }


  async getMessagesToFindChannel(channel: Channel): Promise<Message[]> {
    const messagesRef = this.getChannelsColRef(channel);
    const querySnapshot = await getDocs(messagesRef);
    return querySnapshot.docs.map(doc => doc.data() as Message);
  }

  async addUserToChannelIfNotMember(user: User): Promise<void> {
    const channelId = 'XD5Fx4D0uf3td5AYjkMa'; // Die ID des Zielkanals
    const channelRef = doc(this.firestore, `channels/${channelId}`);
    const channelSnapshot = await getDoc(channelRef);
    
    if (channelSnapshot.exists()) {
      let channel = channelSnapshot.data() as Channel;
      const isMember = channel.members.some(member => member.id === user.id);
      
      if (!isMember) {
        const updatedMembers: User[] = [...channel.members, user];
        await updateDoc(channelRef, { members: updatedMembers });
      } 
    } else {
      console.error('Kanal existiert nicht.');
    }
  }



  getChannelToFindMessage(messageId: string): Channel | undefined {
    return this.messageChannelMap.get(messageId);
  }


  getChannelsRef() {
    return collection(this.firestore, 'channels');
  }


  getUpdatedChannelsColRef(selectedChannel: Channel, id: string) {
    return doc(this.firestore, `channels/${selectedChannel.id}/messages/${id}`);
  }


  getChannelsColRef(selectedChannel: Channel) {
    return collection(this.firestore, `channels/${selectedChannel.id}/messages`);
  }


  getSingleDocRef(coldId: string, docID: string) {
    return doc(collection(this.firestore, coldId), docID)
  }


  ngOnDestroy() {
    this.unsubChannels();
  }

}
