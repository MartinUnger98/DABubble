import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { DataService } from 'src/app/shared-services/data.service';
import { Message } from './../../../models/message.class'
import { ChannelsService } from 'src/app/shared-services/channels.service';
import { Subscription } from 'rxjs';
import { Channel } from 'src/app/models/channel.class';
import { Reaction } from 'src/app/models/reaction.class';
import { User } from 'src/app/models/user.class';

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

  constructor(private dataService: DataService, private channelService: ChannelsService) {
    this.unsubChannels = this.channelService.selectedChannel$.subscribe(selectedChannel => {
      if (selectedChannel) {
        this.selectedChannel = selectedChannel;
        this.receiveChatMessages();
      } else {
        console.log('waiting for selected channel');
      }
    });

    this.channelService.currentUserInfo$.subscribe((user: User) => {
      this.user = user;
    });
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
  }

  receiveChatMessages() {
    this.channelService.updateChatMessageOfSelectedChannel();
    this.channelService.getReactionsOfMessages();
    this.chatMessages = this.channelService.chatMessages;
    this.sortChatMessages();
  }

  customSort = (a: any, b: any) => {
    const dateA = new Date(a.timestamp);
    const dateB = new Date(b.timestamp);
    if (dateA > dateB) {
      return 1;
    } else if (dateA < dateB) {
      return -1;
    } else {
      return 0;
    }
  }

  sortChatMessages() {
    this.chatMessages.sort(this.customSort);
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
      this.message.setMessage(this.input_message.nativeElement.value.trim());
      this.channelService.pushMessageToChannel(this.message);
      this.input_message.nativeElement.value = '';
    }
  }

  ngOnDestroy() {
    this.unsubChannels.unsubscribe();
  }
}
