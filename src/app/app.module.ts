import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeroCardsComponent } from './hero-cards/hero-cards.component';
import { LoadingService } from './loading/loading.service';
import { MessagesService } from './messages/messages.service';
import { MatSidenavModule } from '@angular/material/sidenav';

@NgModule({
    declarations: [AppComponent, HeroCardsComponent],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        AppRoutingModule,
        HttpClientModule,
        MatSidenavModule,
    ],
    providers: [LoadingService, MessagesService],
    bootstrap: [AppComponent],
})
export class AppModule {}
