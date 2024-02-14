import { Component } from '@angular/core';
import { DataService } from 'src/app/shared-services/data.service';

@Component({
  selector: 'app-main-content-workspace-header',
  templateUrl: './main-content-workspace-header.component.html',
  styleUrls: ['./main-content-workspace-header.component.scss']
})
export class MainContentWorkspaceHeaderComponent {

  constructor(
    public dataService: DataService
  ) { }

  returnToWorkspace() {
    this.dataService.new_message_open$.next(false);
    this.dataService.directmessage_open$.next(false);
    this.dataService.workspace_header_open$.next(false);
    this.dataService.mainchat_mobile_open$.next(false);
    this.dataService.threadchat_mobile_open$.next(false);
    this.dataService.thread_open$.next(false);
    this.dataService.show_new_message_btn$.next(true);
  }
}
