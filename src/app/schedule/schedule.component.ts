import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { map, Observable } from 'rxjs';
import { LoadingService } from '../loading/loading.service';
import { CronSchedules } from '../shared.interfaces';

@Component({
    selector: 'schedule',
    templateUrl: './schedule.component.html',
    styleUrls: ['./schedule.component.scss'],
})
export class ScheduleComponent implements OnInit {
    crons: CronSchedules;
    constructor(private http: HttpClient, private loading: LoadingService) {}

    ngOnInit(): void {
        this.getCrons$();
    }

    getCrons$() {
        this.http.get<CronSchedules>('/api/sync/crons').subscribe((val) => {
            this.crons = val;
        });
    }
}
