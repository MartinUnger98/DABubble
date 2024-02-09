import { Component } from '@angular/core';
import { OpenDialogService } from 'src/app/shared-services/open-dialog.service';
import { AuthService } from '../../shared-services/authentication.service';
import { ChannelsService } from 'src/app/shared-services/channels.service';
import { User } from 'src/app/models/user.class';
import { DataService } from 'src/app/shared-services/data.service';

@Component({
  selector: 'app-main-content-profile-selector',
  templateUrl: './main-content-profile-selector.component.html',
  styleUrls: ['./main-content-profile-selector.component.scss']
})
export class MainContentProfileSelectorComponent {
  currentUserInfo!: User;
  profilemenu_open: boolean = false;
  mobile: boolean = false;

  constructor(
    private dataService: DataService,
    private dialogService: OpenDialogService,
    private authService: AuthService,
    private channelService: ChannelsService
  ) {
    this.channelService.currentUserInfo$.subscribe(user => {
      this.currentUserInfo = user;
    });

    this.dataService.mobile$.subscribe((value: boolean) => {
      this.mobile = value;
    });
  }

  toggleProfilemenu() {
    this.profilemenu_open = !this.profilemenu_open;
  }

  openDialog(componentKey: string): void {
    this.dialogService.openDialog(componentKey);
    this.profilemenu_open = false;
  }

  logout() {
    this.authService.logout();
  }
}
