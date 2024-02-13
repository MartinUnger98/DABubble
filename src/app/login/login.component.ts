import { Component, OnInit } from '@angular/core';
import { AuthService } from '../shared-services/authentication.service';
import { User } from '../models/user.class';
import { UserService } from '../shared-services/user.service';
import { StorageService } from '../shared-services/storage.service';
import { CommonService } from '../shared-services/common.service';
import { UserCredential } from 'firebase/auth';
import { ChannelsService } from '../shared-services/channels.service';
@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit{
  user: User = new User();
  isCheckboxChecked: boolean = false;
  selectedAvatar = 'assets/avatars/avatar_0.svg';
  selectedAvatarIndex: number = -1;
  avatarFile: File | null = null;
  errorUploadFile: boolean = false;
  hideAfterAnimation: boolean = false;
  showSpinner: boolean = false;
  avatarPaths = [
    'assets/avatars/avatar_1.svg',
    'assets/avatars/avatar_2.svg',
    'assets/avatars/avatar_3.svg',
    'assets/avatars/avatar_4.svg',
    'assets/avatars/avatar_5.svg',
    'assets/avatars/avatar_6.svg',
  ];
  switch_expression: string = "login";
  loginErrorUser: boolean = false;
  loginErrorPassword: boolean = false;
  currentUserCredential: UserCredential | null;

  constructor(private authService: AuthService,
    private userService: UserService,
    private storageService: StorageService,
    public commonService: CommonService,
    private channelsService: ChannelsService
    ) { this.currentUserCredential = null; }

  
  ngOnInit() {
    setTimeout(() => {
      this.hideAfterAnimation = true;
    }, 4000);
  }

  async login() {
    const userExists = await this.checkUserExists();
    if (userExists) {
      this.authService.login(this.user.email, this.user.password)
        .then((userCredential) => {
          this.currentUserCredential = userCredential;
          if (userCredential.user.emailVerified) {
            this.loginUser(userCredential);
          } else {
            this.commonService.showVerifyPopup('verifiy-mail-login');
          }
        })
        .catch(error => {
          if (error.code === 'auth/too-many-requests' || error.code === 'auth/invalid-credential' || error.code === 'auth/missing-password' || (error.errors && error.errors.message === 'INVALID_LOGIN_CREDENTIAL')) {
            this.loginErrorPassword = true;
          }
        })
    }
  }


  loginGuest() {
    this.loginErrorUser = false;
    this.authService.login('guestLogin@guest.com', 'Guestlogin')
      .then((userCredential) => {
        this.channelsService.deleteGuestMessages();
        this.loginUser(userCredential);
      })
  }

  async loginGoogle() {
    try {
      let result = await this.authService.loginWithGoogle();
      let {email, displayName, uid} = result.user;
      if (email && displayName) {
        this.checkGooleUserExistsAndCreate(email, displayName, uid);
        this.loginUser(result);
      } else {
        console.log("Google-Konto hat keine gültige E-Mail oder keinen Namen.");
      }
    } catch (error) {
      console.error(error);
    }
  }


  async loginUser(userCredential: UserCredential) {    
    await this.setUserOnline(userCredential);
    const userId = userCredential.user.uid;
    const userInfo = await this.userService.getUserInfos(userId);

    if (userInfo) {
      try {
        await this.channelsService.addUserToChannelIfNotMember(userInfo);
        this.commonService.showPopup('login');
        this.commonService.routeTo('main-content', 2000);
      } catch (error) {
        console.error('Fehler beim Hinzufügen des Benutzers zum Kanal:', error);
      }
    } else {
      console.log('Benutzerinformationen konnten nicht abgerufen werden.');
    }
  }


  async setUserOnline(userCredential: UserCredential) {
    let userId = userCredential.user.uid;
    await this.userService.setUserOnlineStatus(userId, true);
    let userInfo = await this.userService.getUserInfos(userId);
    if (userInfo) {
      sessionStorage.setItem('user', JSON.stringify(userInfo));
    }
  }


  async checkUserExists() {
    this.loginErrorUser = false;
    this.loginErrorPassword = false;
    let userExists = await this.userService.userExistsByEmail(this.user.email);
    if (!userExists) {
      this.loginErrorUser = true;
      return false;
    } else {
      return true;
    }
  }
  

  async checkGooleUserExistsAndCreate(email: string, displayName: string, uid: string) {
    let userExists = await this.userService.userExistsByEmail(email);
    if (!userExists) {
      this.createNewGoogleUser(email, displayName, uid);
    }
  }

  async createNewGoogleUser(email: string, displayName: string, uid: string) {
    let newUser: User = new User({
      email: email,
      name: displayName,
      avatar: 'assets/avatars/google.svg',
      onlineStatus: true,
      id: uid
    });
    await this.userService.createUser(newUser, 'users');
  }

  isFormValid() {
    return this.validateEmail(this.user.email) &&
      this.user.name.length >= 5 &&
      this.user.password.length >= 8 &&
      this.user.password === this.user.confirmPassword &&
      this.isCheckboxChecked;

  }

  validateEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  isPasswordMatching(): boolean {
    return this.commonService.isPasswordMatching(this.user.password, this.user.confirmPassword);
  }

  async moveToAvatar() {
    if (!await this.checkUserExists()) {
      this.changeSwitchCase('avatar');
    } else {
      this.loginErrorUser = true;
    }
  }


  async register() {
    this.loginErrorUser = false;
    document.getElementById('register-bg')?.classList.remove("d-none");
    this.showSpinner = true;
    if (this.avatarFile) {
      this.selectedAvatar = await this.storageService.uploadFile(this.avatarFile);
    }
    try {
      const userCredential = await this.authService.register(this.user.email, this.user.password);
      await this.authService.sendVerificationEmail();
      this.createNormalUser(userCredential);
    } catch (error) {
      console.log(error);
    }
  }

  createNormalUser(userCredential: UserCredential) {
    this.user.id = userCredential.user.uid;
    this.user.onlineStatus = false;
    this.user.avatar = this.selectedAvatar;
    this.userService.createUser(this.user, 'users');
    this.showSpinner = false;
    this.commonService.showPopup('register');
    this.switchLogin('register')
  }

  switchLogin(popup_name: string) {
    setTimeout(() => {
      this.setDNonePopup(popup_name);
      this.changeSwitchCase('login');
    }, 2000);
  }

  setDNonePopup(popup_name: string) {
    const popup = document.getElementById(popup_name);
    if (popup) {
      popup.classList.add('d-none');
    };
  }

  async setNewPassword() {
    if (await this.checkUserExists()) {
      this.loginErrorUser = false;
      this.authService.resetPassword(this.user.email)
        .then(() => {
          this.commonService.showPopup('new-pass');
          this.switchLogin('new-pass');
        });
    }
  }

  changeInputPasswordToTxt(event: MouseEvent): void {
    this.commonService.changeInputPasswordToTxt(event);
  }

  changeCheckboxCheck(event: MouseEvent): void {
    let checkboxElement = event.target as HTMLElement;
    checkboxElement.classList.toggle('checked');
    this.isCheckboxChecked = checkboxElement.classList.contains('checked');
  }

  changeSwitchCase(newSwitchCase: string) {
    if ((this.switch_expression === 'avatar' && newSwitchCase === 'signup') || (this.switch_expression === 'forgotPassword' && newSwitchCase === 'login')) {
    } else if (newSwitchCase === 'signup' || newSwitchCase === 'forgotPassword' || newSwitchCase === 'login') {
      this.user = new User();
    }
    this.loginErrorUser = false;
    this.switch_expression = newSwitchCase;
  }

  changeToSignupAndUncheck() {
    this.isCheckboxChecked = false;
    this.changeSwitchCase('signup');
  }

  changeAvatar(newAvatar: string, index: number): void {
    this.errorUploadFile = false;
    this.selectedAvatar = newAvatar;
    this.selectedAvatarIndex = index;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) {
      return;
    }
    this.errorUploadFile = !this.commonService.checkFileSize(input);
    if (!this.errorUploadFile) {
      const file = input.files[0];
      this.selectedAvatar = URL.createObjectURL(file);
      this.avatarFile = file;
    }
  }

 

}
