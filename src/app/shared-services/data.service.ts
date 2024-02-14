import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  public thread_open$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  public directmessage_open$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  public new_message_open$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  public mobile$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  public workspace_header_open$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  public mainchat_mobile_open$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  public threadchat_mobile_open$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  public update_sidebar$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  public spinnerVisible$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  public show_new_message_btn$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);

  constructor() {
    this.initializeScreenSizeListeners();
  }

  initializeScreenSizeListeners() {
    this.updateMobileStatus(); // Überprüfe den Status sofort beim Laden
    window.addEventListener('resize', () => {
      this.updateMobileStatus(); // Aktualisiere den Status bei jeder Größenänderung
    });
  }

  updateMobileStatus() {
    const bildBreite = window.innerWidth;
    this.mobile$.next(bildBreite <= 1180);
  }

  showSpinner(visible: boolean) {
    this.spinnerVisible$.next(visible);
  }
}
