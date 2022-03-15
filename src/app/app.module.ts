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
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { AboutComponent } from './about/about.component';
import { ScheduleComponent } from './schedule/schedule.component';
@NgModule({
    declarations: [AppComponent, HeroCardsComponent, AboutComponent, ScheduleComponent],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        AppRoutingModule,
        HttpClientModule,
        MatSidenavModule,
        MatIconModule,
        MatToolbarModule,
        MatButtonModule,
        MatListModule,
    ],
    providers: [LoadingService, MessagesService],
    bootstrap: [AppComponent],
})
export class AppModule {}
