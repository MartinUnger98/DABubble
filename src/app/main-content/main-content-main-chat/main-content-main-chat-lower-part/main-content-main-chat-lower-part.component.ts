import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { DataService } from 'src/app/shared-services/data.service';
import { Message } from './../../../models/message.class'
import { ChannelsService } from 'src/app/shared-services/channels.service';
import { Subscription, timestamp } from 'rxjs';
import { Channel } from 'src/app/models/channel.class';
import { Reaction } from 'src/app/models/reaction.class';
import { User } from 'src/app/models/user.class';
import { CommonService } from 'src/app/shared-services/common.service';
import { StorageService } from 'src/app/shared-services/storage.service';
import { formatDate } from '@angular/common';

@Component({
  selector: 'app-main-content-main-chat-lower-part',
  templateUrl: './main-content-main-chat-lower-part.component.html',
  styleUrls: ['./main-content-main-chat-lower-part.component.scss']
})
export class MainContentMainChatLowerPartComponent {
  @ViewChild('message') input_message!: ElementRef;
  @ViewChild('chat_content') chat_content!: ElementRef;
  message = new Message();
  reaction = new Reaction();
  selectedChannel!: Channel | null;
  unsubChannels!: Subscription;
  chatMessages: any = [];
  emoji_window_open: boolean = false;
  emoji_window_messages_open: boolean = false;
  user: User = null!;
  hoverOptionEditMessage_open: boolean = false;
  messageReactions: any = [];
  thread_subject: any = [];
  editingMessage: boolean = false;
  textareaCols!: number;
  textAreaContent!: string;
  editedText!: string;
  uploadedFileLink: string | null = null;

  constructor(private dataService: DataService, private channelService: ChannelsService, public commonService: CommonService, private storageService: StorageService) {
    this.unsubChannels = this.channelService.selectedChannel$.subscribe(selectedChannel => {
      if (selectedChannel) {
        this.selectedChannel = selectedChannel;
        this.receiveChatMessages();
      } else {
        console.log('waiting for selected channel');
      }
    });

    this.channelService.thread_subject$.subscribe((thread_subject: Message) => {
      if (thread_subject) {
        this.thread_subject = thread_subject;
        this.textAreaContent = this.thread_subject.message;
      } else {
        //kann noch geändert werden
        console.log('waiting for thread subject');
        this.textAreaContent = '';
      }
    });


    this.channelService.currentUserInfo$.subscribe((user: User) => {
      this.user = user;
    });
  }

  returnPartingLineValue(index: number): { text: string, boolean: boolean } {
    let chatMessages = this.chatMessages;
    let currentMessageTimestamp = this.getDatePartsFromFormattedDate(chatMessages[index].timestamp);

    if (chatMessages[index - 1]) {
      let previousMessageTimestamp = this.getDatePartsFromFormattedDate(chatMessages[index - 1].timestamp);
      let lastMessageTimestamp = this.getDatePartsFromFormattedDate(chatMessages[chatMessages.length - 1].timestamp);
      let today = formatDate(new Date(), 'dd-MM-yyyy HH:mm', 'en-US');
      let todayTimestamp = this.getDatePartsFromFormattedDate(today);

      if (currentMessageTimestamp.year == previousMessageTimestamp.year) {
        if (currentMessageTimestamp.month == previousMessageTimestamp.month) {
          if (currentMessageTimestamp.day == previousMessageTimestamp.day) {
            //der selbe tag
            return {
              'text': `nicht verfügbar`,
              'boolean': false,
            };
          } else if (currentMessageTimestamp.day == todayTimestamp.day) {
            //heute
            return {
              'text': `Heute`,
              'boolean': true,
            };
          } else if (lastMessageTimestamp.day - 1 == currentMessageTimestamp.day) {
            //gesetern
            return {
              'text': `Gestern`,
              'boolean': true,
            };
          } else {
            // Dieser Monat aber nicht der selbe Tag
            return {
              'text': `${currentMessageTimestamp.day}.${currentMessageTimestamp.month}.${currentMessageTimestamp.year}`,
              'boolean': true,
            };
          }
        } else {
          //nicht dieser Monat
          return {
            'text': `${currentMessageTimestamp.day}.${currentMessageTimestamp.month}.${currentMessageTimestamp.year}`,
            'boolean': true,
          };
        }
      } else {
        //nicht dieses Jahr
        return {
          'text': `${currentMessageTimestamp.day}.${currentMessageTimestamp.month}.${currentMessageTimestamp.year}`,
          'boolean': true,
        };
      }
    }
    else {
      // keine vorherige nachricht verfügbar
      return {
        'text': `${currentMessageTimestamp.day}.${currentMessageTimestamp.month}.${currentMessageTimestamp.year}`,
        'boolean': true,
      };
    }
  }

  getDatePartsFromFormattedDate(formattedDate?: string): { day: number, month: number, year: number } {
    const parts = (formattedDate ?? '').split(' ')[0].split('-');

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);

    return { day, month, year };
  }

  checkChannelCreationTime() {
    const selectedChannelTimestamp = this.getDatePartsFromFormattedDate(this.channelService.selectedChannel$.value?.timestamp.toString());
    const timestampNow = this.getDatePartsFromFormattedDate(formatDate(new Date(), 'dd-MM-yyyy HH:mm', 'en-US'));

    if (timestampNow.year == selectedChannelTimestamp.year) {
      if (timestampNow.month == selectedChannelTimestamp.month) {
        if (timestampNow.day == selectedChannelTimestamp.day) {
          return 'heute'
        } else if ((timestampNow.day - 1) == selectedChannelTimestamp.day) {
          return 'gestern'
        } else {
          return `${selectedChannelTimestamp.day}.${selectedChannelTimestamp.month}.${selectedChannelTimestamp.year}`
        }
      } else {
        return `${selectedChannelTimestamp.day}.${selectedChannelTimestamp.month}.${selectedChannelTimestamp.year}`
      }
    } else {
      return `${selectedChannelTimestamp.day}.${selectedChannelTimestamp.month}.${selectedChannelTimestamp.year}`
    }
  }

  checkChannelCreator() {
    if (this.selectedChannel?.creator == this.user.name) {
      return 'Du hast';
    } else {
      return `${this.selectedChannel?.creator} hat`;
    }
  }

  changedTextMessage(event: Event) {
    this.editedText = (event.target as HTMLTextAreaElement).value
  }

  async saveEditedMessage() {
    const thread_subject = this.channelService.thread_subject$.value
    const editedText = this.editedText;

    this.message.id = thread_subject.id;
    this.message.setMessage(editedText.trim());
    this.message.creator = thread_subject.creator;
    this.message.avatar = thread_subject.avatar;
    this.message.timestamp = thread_subject.timestamp;
    this.message.reactions = thread_subject.reactions;
    this.message.answered_number = thread_subject.answered_number;
    this.message.latest_answer = thread_subject.latest_answer;

    this.channelService.updateMessage(this.message);
    this.toggleEditing();
  }

  editMessage(text: string) {
    this.updateTextareaSize(text);
    this.toggleHoverOptionEditMessage();
    setTimeout(() => {
      this.toggleEditing();
    }, 100);
  }

  updateTextareaSize(text: string) {
    const lines = text.split('\n');
    this.textareaCols = Math.max(...lines.map(line => line.length));
  }

  toggleEditing() {
    this.editingMessage = !this.editingMessage;
  }

  @HostListener('document:click', ['$event'])
  documentClickHandler(event: MouseEvent): void {
    if (this.emoji_window_messages_open && !this.isClickInsideContainer(event)) {
      this.emoji_window_messages_open = false;
    }
  }

  toggleHoverOptionEditMessage() {
    this.hoverOptionEditMessage_open = !this.hoverOptionEditMessage_open;
  }

  private isClickInsideContainer(event: MouseEvent): boolean {
    let containerElement = document.getElementById('emoji-window-messages');

    if (containerElement) {
      return containerElement.contains(event.target as Node);
    }
    return false;
  }

  addReaction($event: any) {
    const currentUserInfo = this.channelService.currentUserInfo$.value

    this.reaction.setReaction($event.emoji.native);
    this.reaction.setCreator(currentUserInfo.name);
    this.channelService.addReactionToMessage(this.reaction);
    this.emoji_window_messages_open = false;
  }

  addEmoji($event: any) {
    if ($event.emoji.native !== '🫥') {
      this.input_message.nativeElement.value += $event.emoji.native;
      //console.log($event.emoji);
      this.emoji_window_open = false;
    }
  }

  toggleEmojiWindowForMessage(index: number) {
    setTimeout(() => {
      this.emoji_window_messages_open = !this.emoji_window_messages_open;
    }, 50);
    this.channelService.selectedMessageMainChat$.next(this.chatMessages[index]);
  }

  toggleEmojiWindow() {
    this.emoji_window_open = !this.emoji_window_open;
  }

  selectMessageForThread(index: number) {
    this.channelService.thread_subject$.next(this.chatMessages[index]);
    this.channelService.thread_subject_index$.next(index);
  }

  receiveChatMessages() {
    this.channelService.updateChatMessageOfSelectedChannel();
    this.channelService.getReactionsOfMessages();
    this.channelService.sortChatMessagesByTime();
    this.chatMessages = this.channelService.chatMessages;
  }

  getFormattedTimeForLatestAnswer(latest_answer: any) {
    const timeParts = latest_answer.split(' ')[1].split(':');
    const hours = timeParts[0];
    const minutes = timeParts[1];
    return `${hours}:${minutes}`;
  }

  getFormattedTime(message: any) {
    const timeParts = message.timestamp.split(' ')[1].split(':');
    const hours = timeParts[0];
    const minutes = timeParts[1];
    return `${hours}:${minutes}`;
  }

  openThread() {
    //setzt den thread_open boolean auf true.
    // Bei veränderung wird in Main-content.ts eine funktion ausgelöst da main content die function abonniert hat
    this.dataService.setBooleanValue(true);
  }

  sendMessageToChannel() {
    const currentUserInfo = this.channelService.currentUserInfo$.value

    if (this.input_message.nativeElement.value.trim() !== '') {
      this.message.setCreator(currentUserInfo.name);
      this.message.setAvatar(currentUserInfo.avatar);
      this.message.setTimestampNow();
      this.message.setAnwers();
      /* debugger
      if (this.uploadedFileLink) {
        const messageWithLink = this.input_message.nativeElement.value.trim() + "\nDatei: " + this.uploadedFileLink;
        this.message.setMessage(messageWithLink);
      } else { */
      this.message.setMessage(this.input_message.nativeElement.value.trim());
      /*  }    */
      this.channelService.pushMessageToChannel(this.message);
      this.input_message.nativeElement.value = '';
    }
  }

  ngOnDestroy() {
    this.unsubChannels.unsubscribe();
  }
  /* 
    async handleFileInput(event: any) {
      const file = event.target.files[0];
      if (file) {
        try {
          const uploadedUrl = await this.storageService.uploadFile(file);
          this.uploadedFileLink = uploadedUrl;
        } catch (error) {
          console.error('Fehler beim Hochladen der Datei', error);
        }
      }
    }
  
    removeUploadedFile() {
      this.uploadedFileLink = null;
    }
   */
}
