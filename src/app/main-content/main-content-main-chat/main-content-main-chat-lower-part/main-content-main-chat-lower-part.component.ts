import { AfterViewInit, Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { DataService } from 'src/app/shared-services/data.service';
import { Message } from './../../../models/message.class';
import { ChannelsService } from 'src/app/shared-services/channels.service';
import { Channel } from 'src/app/models/channel.class';
import { Reaction } from 'src/app/models/reaction.class';
import { User } from 'src/app/models/user.class';
import { CommonService } from 'src/app/shared-services/common.service';
import { formatDate } from '@angular/common';
import { MessagesService } from 'src/app/shared-services/messages.service';
import { UserService } from 'src/app/shared-services/user.service';
import { OpenDialogService } from 'src/app/shared-services/open-dialog.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-main-content-main-chat-lower-part',
  templateUrl: './main-content-main-chat-lower-part.component.html',
  styleUrls: ['./main-content-main-chat-lower-part.component.scss']
})
export class MainContentMainChatLowerPartComponent implements AfterViewInit {
  @ViewChild('message') input_message!: ElementRef;
  @ViewChild('img') img!: ElementRef;
  @ViewChild('chat_content') chat_content!: ElementRef;
  @ViewChild('fileInput') fileInput!: ElementRef;
  @ViewChild('message') messageTextArea!: ElementRef;
  @HostListener('document:click', ['$event'])
  documentClickHandler(event: MouseEvent): void {
    if (this.emoji_window_messages_open && !this.isClickInsideContainer(event)) {
      this.emoji_window_messages_open = false;
    }
  }
  message = new Message();
  reaction = new Reaction();
  messageReactions: any = [];
  thread_subject: any = [];
  allUser: User[] = [];
  filteredUsers: User[] = [];
  chatMessages: any = [];
  user: User = null!;
  selectedChannel!: Channel | null;
  uploadedFileLink: string | null = null;
  textAreaContent!: string;
  editedText!: string;
  textareaCols!: number;
  reactionInfoNumber!: number;
  reactionInfoMessage!: number;
  emoji_window_open: boolean = false;
  emoji_window_messages_open: boolean = false;
  hoverOptionEditMessage_open: boolean = false;
  editingMessage: boolean = false;
  errorUploadFile: boolean = false;
  mobile: boolean = false;
  reactionInfo: boolean = false;
  showUserList: boolean = false;
  tags: { id: string, name: string }[] = [];
  isMobileView!: boolean;
  private destroyed$ = new Subject<void>();

  constructor(
    private dataService: DataService,
    private messagesService: MessagesService,
    private channelService: ChannelsService,
    public commonService: CommonService,
    public userService: UserService,
    public dialogService: OpenDialogService,
  ) {}

  ngOnInit(): void {
    this.subscribeToObservables();
  }

  ngAfterViewInit(): void {
    this.focusInputMessage();
  }

  private subscribeToObservables(): void {
    this.channelService.selectedChannel$.pipe(takeUntil(this.destroyed$)).subscribe(selectedChannel => {
      if (selectedChannel) {
        this.selectedChannel = selectedChannel;
        this.receiveChatMessages();
        this.focusInputMessage();
      }
    });

    this.messagesService.thread_subject$.pipe(takeUntil(this.destroyed$)).subscribe(thread_subject => {
      if (thread_subject) {
        this.thread_subject = thread_subject;
        this.textAreaContent = this.thread_subject.message;
      } else {
        this.textAreaContent = '';
      }
    });

    this.channelService.currentUserInfo$.pipe(takeUntil(this.destroyed$)).subscribe(user => {
      this.user = user;
    });

    this.dataService.mobile$.pipe(takeUntil(this.destroyed$)).subscribe(value => {
      this.mobile = value;
    });

    this.userService.users$.pipe(takeUntil(this.destroyed$)).subscribe(users => {
      this.allUser = users;
    });

    this.dialogService.isMobileView$.pipe(takeUntil(this.destroyed$)).subscribe(isMobileView => {
      this.isMobileView = isMobileView;
    });
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  focusInputMessage(): void {
    if (this.input_message && this.input_message.nativeElement) {
      this.input_message.nativeElement.focus();
    }
  }

  onTextareaInput(event: any) {
    this.commonService.onTextareaInput(event, this.allUser, (filteredUsers, showUserList) => {
      this.filteredUsers = filteredUsers;
      this.showUserList = showUserList;
    });
  }

  insertUserName(userName: string, userId: string) {
    this.commonService.insertUserName(userName, this.input_message.nativeElement, this.allUser, (filteredUsers, showUserList) => {
      this.filteredUsers = filteredUsers;
      this.showUserList = showUserList;
      this.tags.push({ id: userId, name: userName });
    });
  }

  formatMessageParts(message: Message): (string | { text: string, id: string })[] {
    const parts: (string | { text: string, id: string })[] = [];
    let text = message.message;

    if (Array.isArray(message.tags)) {
      message.tags.forEach(tag => {
        let start = text.indexOf(`@${tag.name}`);
        if (start !== -1) {
          if (start > 0) parts.push(text.substring(0, start));
          parts.push({ text: tag.name, id: tag.id });
          text = text.substring(start + tag.name.length + 1);
        }
      });
    }

    if (text.length > 0) parts.push(text);
    return parts;
  }


  addAtSymbolToTextarea() {
    const textarea: HTMLTextAreaElement = this.messageTextArea.nativeElement;
    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const textBefore = textarea.value.substring(0, startPos);
    const textAfter = textarea.value.substring(endPos, textarea.value.length);
    textarea.value = textBefore + '@' + textAfter;
    textarea.focus();
    textarea.dispatchEvent(new Event('input'));    
  }

  /**
   * this function opens the profile of the selected person
   * @param id user id
   */
  async openProfile(id: string): Promise<void> {
    try {
      const userInfo = await this.userService.getUserInfos(id);
      if (userInfo) {
        const user = new User(userInfo);
        this.userService.setSelectedUser(user);
        this.dialogService.openDialog('showProfile', false, this.isMobileView);
      } else {
        console.log("Benutzer nicht gefunden");
      }
    } catch (error) {
      console.error('Fehler beim Abrufen des Benutzerprofils:', error);
    }
  }

  isPartTag(part: any): part is { text: string; id: string } {
    return typeof part === 'object' && 'id' in part && 'text' in part;
  }

  /**
   * this function filters which info window will be displayed if hovered on a reaction
   * @param i the index of the message
   * @param j the index of the reaction in the message
   */
  openReactionInfo(i: number, j: number) {
    this.reactionInfo = true;
    this.reactionInfoMessage = i;
    this.reactionInfoNumber = j;
  }

  /**
 * this function closes the info window
 */
  closeReactionInfo() {
    this.reactionInfo = false;
  }

  /**
 * this function scrolls the chat all the way to the bottom
 */
  updateScroll() {
    setTimeout(() => {
      this.chat_content.nativeElement.scrollTop = this.chat_content.nativeElement.scrollHeight;
    }, 0);
  }

  /**
 * this function splits the date between weekdays and months and returns the values. it is used for displaying the chat history date.
 * @param date the date of the messages
 * @returns weekday and month
 */
  extractWeekdayAndMonth(date?: string): { weekday: string, month: string } {
    const weekdays = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    let dateParts = (date ?? '').split(' ');
    let dayMonthYear = dateParts[0].split('-');
    let time = dateParts[1].split(':');
    let day = parseInt(dayMonthYear[0], 10);
    let month = parseInt(dayMonthYear[1], 10) - 1;
    let year = parseInt(dayMonthYear[2], 10);
    let hour = parseInt(time[0], 10);
    let minute = parseInt(time[1], 10);
    let dateObject = new Date(year, month, day, hour, minute);
    let weekdayIndex = dateObject.getDay();
    let monthIndex = dateObject.getMonth();
    let weekday = weekdays[weekdayIndex];
    let monthName = months[monthIndex];
    return { weekday, month: monthName };
  }

  /**
 * this function the correct date that will be displayed in the parting line between messages.
 * @param index index of the message
 * @returns the correct date and the availability
 */
  returnPartingLineValue(index: number): { text: string, boolean: boolean } {
    let chatMessages = this.chatMessages;
    let currentMessageTimestamp = this.getDatePartsFromFormattedDate(chatMessages[index].timestamp);
    let currentMessageWeekdayAndMonth = this.extractWeekdayAndMonth(chatMessages[index].timestamp);

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
              'text': `${currentMessageWeekdayAndMonth.weekday}, ${currentMessageTimestamp.day}. ${currentMessageWeekdayAndMonth.month}`,
              'boolean': true,
            };
          }
        } else {
          //nicht dieser Monat
          return {
            'text': `${currentMessageWeekdayAndMonth.weekday}, ${currentMessageTimestamp.day}. ${currentMessageWeekdayAndMonth.month}`,
            'boolean': true,
          };
        }
      } else {
        //nicht dieses Jahr
        return {
          'text': `${currentMessageWeekdayAndMonth.weekday}, ${currentMessageTimestamp.day}. ${currentMessageWeekdayAndMonth.month}, ${currentMessageTimestamp.year}`,
          'boolean': true,
        };
      }
    }
    else {
      // keine vorherige nachricht verfügbar
      return {
        'text': `${currentMessageWeekdayAndMonth.weekday}, ${currentMessageTimestamp.day}. ${currentMessageWeekdayAndMonth.month}, ${currentMessageTimestamp.year}`,
        'boolean': true,
      };
    }
  }

  /**
 * this function extracts the correct number values for the date, month and year. it's a helpful function to extract the date for the parting line values
 * @param formattedDate the date
 * @returns day, month and year as numbers
 */
  getDatePartsFromFormattedDate(formattedDate?: string): { day: number, month: number, year: number } {
    const parts = (formattedDate ?? '').split(' ')[0].split('-');
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    return { day, month, year };
  }

  /**
   * this functions returns the date when the channel was created and modifies the text depending on creation time
   * @returns date
   */
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
          return `am ${selectedChannelTimestamp.day}.${selectedChannelTimestamp.month}.${selectedChannelTimestamp.year}`
        }
      } else {
        return `am ${selectedChannelTimestamp.day}.${selectedChannelTimestamp.month}.${selectedChannelTimestamp.year}`
      }
    } else {
      return `am ${selectedChannelTimestamp.day}.${selectedChannelTimestamp.month}.${selectedChannelTimestamp.year}`
    }
  }

  /**
   * this function checks who created the channel
   * @returns a different depending on who created the channel
   */
  checkChannelCreator() {
    if (this.selectedChannel?.creator == this.user.name) {
      return 'Du hast';
    } else {
      return `${this.selectedChannel?.creator} hat`;
    }
  }

  /**
 * this function displays the edited text
 * @param event 
 */
  changedTextMessage(event: Event) {
    this.editedText = (event.target as HTMLTextAreaElement).value
  }

  /**
 * this functions fills all the neccesary key's with the correct informations
 */
  setMessageInformationsForEdit() {
    const thread_subject = this.messagesService.thread_subject$.value
    const editedText = this.editedText;
    this.message.id = thread_subject.id;
    this.message.setMessage(editedText.trim());
    this.message.creator = thread_subject.creator;
    this.message.creatorId = thread_subject.creatorId
    this.message.avatar = thread_subject.avatar;
    this.message.timestamp = thread_subject.timestamp;
    this.message.reactions = thread_subject.reactions;
    this.message.answered_number = thread_subject.answered_number;
    this.message.latest_answer = thread_subject.latest_answer;
  }

  /**
 * this function saves the edited message
 */
  async saveEditedMessage() {
    this.setMessageInformationsForEdit();
    this.messagesService.updateMessage(this.message);
    this.toggleEditing();
  }

  /**
   * this function edits the messages, that is selected
   * @param text the text that will be edited
   * @param i the index of the message
   */
  editMessage(text: string, i: number) {
    this.selectMessageForThread(i);
    this.updateTextareaSize(text);
    this.toggleHoverOptionEditMessage();
    setTimeout(() => {
      this.toggleEditing();
    }, 100);
  }

  /**
 * this functions helps deciding how big the edit window will be sized
 * @param text the text to measure the length
 */
  updateTextareaSize(text: string) {
    const lines = text.split('\n');
    this.textareaCols = Math.max(...lines.map(line => line.length));
  }

  /**
   * this function toggles the editingMessage variable between true or false.
   */
  toggleEditing() {
    this.editingMessage = !this.editingMessage;
  }

  /**
 * this function opens the window with the message ('Nachricht bearbeiten'). it's used to toggle editing.
 */
  toggleHoverOptionEditMessage() {
    this.hoverOptionEditMessage_open = !this.hoverOptionEditMessage_open;
  }

  /**
 * this function listens if someone clicked inside or outside an the emoji-window. if clicked outside the window gets closed
 * @param event click
 * @returns either false or the container that was clicked
 */
  private isClickInsideContainer(event: MouseEvent): boolean {
    let containerElement = document.getElementById('emoji-window-messages');
    if (containerElement) {
      return containerElement.contains(event.target as Node);
    }
    return false;
  }

  /**
   * this function adds a reaction that you can not choose from
   * @param emoji the emoji
   * @param i index of the message
   */
  addPreSelectedReaction(emoji: string, i: number) {
    this.messagesService.selectedMessageMainChat$.next(this.chatMessages[i]);
    this.reaction.setReaction(emoji);
    this.messagesService.addReactionToMessage(this.reaction);
    this.emoji_window_messages_open = false;
  }

  /**
 * this function adds a reaction to the message
 * @param $event the emoji, that was selected
 */
  addReaction($event: any) {
    this.reaction.setReaction($event.emoji.native);
    this.messagesService.addReactionToMessage(this.reaction);
    this.emoji_window_messages_open = false;
  }

  /**
 * this functions adds the selected emoji in the input where you write your messages
 * @param $event the emoji, that was selected
 */
  addEmoji($event: any) {
    if ($event.emoji.native !== '🫥') {
      this.input_message.nativeElement.value += $event.emoji.native;
      this.emoji_window_open = false;
    }
  }

  /**
 * this functions toggles the window where you can choose your emoji from.
 * @param index index of the message
 */
  toggleEmojiWindowForMessage(index: number) {
    setTimeout(() => {
      this.emoji_window_messages_open = !this.emoji_window_messages_open;
    }, 50);
    this.messagesService.selectedMessageMainChat$.next(this.chatMessages[index]);
  }

  /**
 * this functions toggles the variable emoji_window_open that is used to open the window where you can choose the emoji from
 */
  toggleEmojiWindow() {
    this.emoji_window_open = !this.emoji_window_open;
  }

  /**
   * this function selects a message for the thread and opens the thread-chat
   * @param i index of the message
   */
  selectMessageAndOpenThread(i: number) {
    this.selectMessageForThread(i);
    this.openThread();
  }

  /**
   * this function sets the next value for the observable, used to select the topic of the thread-chat
   * @param index index of the message
   */
  selectMessageForThread(index: number) {
    let counter = 0;
    try {
      const intervalId = setInterval(() => {
        this.messagesService.thread_subject$.next(this.chatMessages[index]);
        this.messagesService.thread_subject_index$.next(index);
        counter++;
        if (counter === 6) {
          clearInterval(intervalId);
        }
      }, 30);
    }
    catch {
    }
  }

  /**
 * this function gives the next value for an obersable used to select the correct message that will be displayed in the thread-chat
 * @param index 
 */
  receiveChatMessages() {
    this.messagesService.updateChatMessageOfSelectedChannel();
    this.messagesService.getReactionsOfMessages();
    this.messagesService.sortChatMessagesByTime();
    this.chatMessages = this.messagesService.chatMessages;
    if (!this.dataService.thread_open$.value) {
      this.updateScroll();
    }
  }

  /**
   * this function returns the date of the latest answer on a message
   * @param latest_answer 
   * @returns date
   */
  getFormattedTimeForLatestAnswer(latest_answer: any) {
    const timeParts = latest_answer.split(' ')[1].split(':');
    const hours = timeParts[0];
    const minutes = timeParts[1];
    return `${hours}:${minutes}`;
  }

  /**
 * this function returns the correct values for the time
 * @param message the message that you need the time of
 * @returns hour and minutes
 */
  getFormattedTime(message: any) {
    const timeParts = message.timestamp.split(' ')[1].split(':');
    const hours = timeParts[0];
    const minutes = timeParts[1];
    return `${hours}:${minutes}`;
  }

  /**
   * this function opens the thread-chat
   */
  openThread() {
    this.dataService.thread_open$.next(true);
    if (this.mobile) {
      this.dataService.threadchat_mobile_open$.next(true);
    }
  }

  /**
 * this function sets the correct information to the neccesary keys
 */
  setMessageInformations() {
    const { name, id, avatar } = this.channelService.currentUserInfo$.value;
    this.message.setCreator(name);
    this.message.setCreatorId(id);
    this.message.setAvatar(avatar);
    this.message.setTimestampNow();
    this.message.setAnwers();
  }

  /**
   * this function sends the message to the channel
   */
  async sendMessageToChannel() {
    this.dataService.showSpinner(true);
    this.setMessageInformations();
    if (this.uploadedFileLink || this.input_message.nativeElement.value.trim() !== '') {
      if (this.uploadedFileLink) {
        this.message.setImg(this.uploadedFileLink);
        this.removeUploadedFile();
      } else if (this.input_message.nativeElement.value.trim() !== '') {
        if (this.tags.length > 0) {
          this.message.tags = this.tags;
          this.tags = [];
        }
        const inputMessage = this.input_message.nativeElement.value.trim();
        this.message.setMessage(inputMessage);
        this.input_message.nativeElement.value = '';
      }
      await this.messagesService.pushMessageToChannel(this.message);
      this.updateScroll();
      this.message.setMessage('');
      this.message.setImg('');
    }
    this.dataService.showSpinner(false);
  }

  /**
   * this function uploads the image that was selected
   * @param event 
   */
  async handleFileInput(event: any) {
    const input = event.target as HTMLInputElement;
    this.errorUploadFile = !this.commonService.checkFileSize(input);
    if (!this.errorUploadFile) {
      this.uploadedFileLink = await this.commonService.handleFileInput(event);
    }
  }

    /**
   * this function removes the image
   */
  removeUploadedFile() {
    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
    this.uploadedFileLink = null;
  }
}
