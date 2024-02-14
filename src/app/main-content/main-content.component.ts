import { Component, OnInit, ViewChild, HostListener } from '@angular/core';
import { DataService } from '../shared-services/data.service';
import { ChannelsService } from '../shared-services/channels.service';
import { AuthService } from '../shared-services/authentication.service';

@Component({
  selector: 'app-main-content',
  templateUrl: './main-content.component.html',
  styleUrls: ['./main-content.component.scss']
})

export class MainContentComponent implements OnInit {
  @ViewChild('grid') grid: any;

  workspace_open: boolean = true;
  workspace_header_open: boolean = false;
  thread_open!: boolean;
  directmessage_open: boolean = false;
  new_message_open: boolean = false;
  mobile: boolean = false;
  mainchat_mobile_open: boolean = false;
  threadchat_mobile_open: boolean = false;
  btnMobile: boolean = false;
  spinnerVisible: boolean = false; 
  showNewMessageBtn: boolean = true;
  private userActivityTimeout: number = 15 * 60 * 1000;
  private userActivityTimer: any;

  constructor(
    private dataService: DataService,
    private channelService: ChannelsService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.subscribeToObservables();
    this.dataService.mobile$.subscribe(isMobile => {
      this.mobile = isMobile;
      this.btnMobile = isMobile;
    });
    this.setCurrentUser();
    this.channelService.subChannelsList();
    this.startUserActivityTimer();
  }

  private subscribeToObservables(): void {
    this.dataService.thread_open$.subscribe(value => {
      this.thread_open = value;
      this.resetUserActivityTimer();
    });

    this.dataService.show_new_message_btn$.subscribe(value => {
      this.showNewMessageBtn = value;
    });

    this.dataService.directmessage_open$.subscribe(value => {
      this.directmessage_open = value;
      this.resetUserActivityTimer();
    });

    this.dataService.new_message_open$.subscribe(value => {
      this.new_message_open = value;
    });

    this.dataService.workspace_header_open$.subscribe(value => {
      this.workspace_header_open = value;
      this.workspace_open = !value;
    });

    this.dataService.mainchat_mobile_open$.subscribe(value => {
      this.mainchat_mobile_open = value;
    });

    this.dataService.threadchat_mobile_open$.subscribe(value => {
      this.threadchat_mobile_open = value;
    });

    this.dataService.spinnerVisible$.subscribe(visible => {
      this.spinnerVisible = visible;
    });
  }

  @HostListener('document:click', ['$event'])
  @HostListener('document:keydown', ['$event'])
  onUserActivity() {
    this.resetUserActivityTimer();
  }

  openNewMessageInputMobile() {
    this.dataService.new_message_open$.next(true);
    this.dataService.thread_open$.next(false);
    this.dataService.directmessage_open$.next(false);
    this.dataService.workspace_header_open$.next(true);
  }

  setCurrentUser() {
    let currentUser = sessionStorage.getItem('user');
    if (currentUser) {
      let userInfo = JSON.parse(currentUser);
      this.channelService.currentUserInfo$.next(userInfo);
    }
  }

  toggleWorkspace() {
    this.workspace_open = !this.workspace_open;
    this.resetUserActivityTimer();
  }

  updateThreadBoolean() {
    this.thread_open = this.dataService.thread_open$.value;
    this.resetUserActivityTimer();
  }

  private startUserActivityTimer(): void {
    this.userActivityTimer = setTimeout(() => {
      this.authService.logout();
    }, this.userActivityTimeout);
  }

  private resetUserActivityTimer(): void {
    clearTimeout(this.userActivityTimer);
    this.startUserActivityTimer();
  }
}
