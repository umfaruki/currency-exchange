import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import { Observable } from 'rxjs';
import { NomicsApiRequestService } from '../shared/service/nomics-api-request.service';
import { AlertService } from '../core/alert/alert.service';
import {
    CurrencyExchangeService,
    PeriodicHistoryElement,
} from '../shared/service/currency-exchange.service';
import { ExchangeRatesResponse } from '../shared/interface/exchange-rates.model';
import { map, startWith } from 'rxjs/operators';
import * as moment from 'moment';
import { StorageService } from '../shared/service/storage.service';
import { MatTableDataSource } from '@angular/material';

export interface Statistics {
    name: string;
    summary: number;
}

export enum FormNames {
    FromControl = 'fromControl',
    ToControl = 'toControl',
}

@Component({
    selector: 'app-converter',
    templateUrl: './converter.component.html',
    styleUrls: ['./converter.component.scss'],
})
export class ConverterComponent implements OnInit {
    periodicHistoryData: PeriodicHistoryElement[] = this.currencyExchangeService
        .periodicHistoryExchangeRates;
    displayedHistoricalColumns: string[] = ['date', 'exchangeRate'];
    periodicHistorySource = this.periodicHistoryData;

    statisticalData: Statistics[] = [
        { name: 'Lowest', summary: 1.13245342 },
        { name: 'Highest', summary: 1.13245342 },
        { name: 'Average', summary: 1.13245342 },
    ];
    displayedStatisticalColumns: string[] = ['name', 'summary'];
    statisticalSource = this.statisticalData;

    selectedDuration = 'sevenDays';

    converterForm: FormGroup;
    filteredFromValues: Observable<string[]>;
    filteredToValues: Observable<string[]>;

    amount: number;
    fromRate: string;
    fromCurrency: string;
    toRate: string;
    toCurrency: string;
    result: string;

    dataSource = new MatTableDataSource(this.currencyExchangeService.periodicHistoryExchangeRates);

    constructor(
        public currencyExchangeService: CurrencyExchangeService,
        private apiRequestService: NomicsApiRequestService,
        private alertService: AlertService,
        private storageService: StorageService,
    ) {}

    ngOnInit() {
        this.converterForm = new FormGroup({
            amountControl: new FormControl('', [Validators.required]),
            fromControl: new FormControl('', [Validators.required]),
            toControl: new FormControl('', [Validators.required]),
        });

        this.converterForm.controls['fromControl'].disable();
        this.converterForm.controls['toControl'].disable();

        this.apiRequestService.getExchangeRates().subscribe(
            (exchangeRate: ExchangeRatesResponse[]) => {
                this.currencyExchangeService.exchangeRates = exchangeRate;

                this.currencyExchangeService.fromCurrencies = this.mapItemCurrencies();

                this.currencyExchangeService.toCurrencies = this.mapItemCurrencies();

                this.converterForm.controls['fromControl'].enable();
                this.converterForm.controls['toControl'].enable();
            },
            (error) => {
                this.alertService.error(`Error: ${error}`);
            },
        );

        this.filteredFromValues = this.getFromValueChanges(FormNames.FromControl);

        this.filteredToValues = this.getToValueChanges(FormNames.ToControl);
    }

    exchangeRates(): void {
        this.fromRate = this.filterSelectedValue(FormNames.FromControl).rate;
        this.fromCurrency = this.filterSelectedValue(FormNames.FromControl).currency;

        this.toRate = this.filterSelectedValue(FormNames.ToControl).rate;
        this.toCurrency = this.filterSelectedValue(FormNames.ToControl).currency;

        this.amount = Math.floor(this.converterForm.get('amountControl').value);

        this.result = (
            (this.converterForm.get('amountControl').value * +this.fromRate) /
            +this.toRate
        ).toFixed(3);

        this.currencyExchangeService.periodicHistoryExchangeRates.push({
            date: moment().format('MM/DD/YYYY'),
            exchangeRate: +this.result,
        });

        this.storageService.setObject('exchangeRates', [
            ...this.currencyExchangeService.periodicHistoryExchangeRates,
        ]);

        this.periodicHistoryData = this.currencyExchangeService.periodicHistoryExchangeRates;

        this.refreshTable();
    }

    changeExchangeInputValues(): void {
        this.converterForm = new FormGroup({
            amountControl: new FormControl(this.converterForm.get('amountControl').value, [
                Validators.required,
            ]),
            fromControl: new FormControl(this.converterForm.get('toControl').value, [
                Validators.required,
            ]),
            toControl: new FormControl(this.converterForm.get('fromControl').value, [
                Validators.required,
            ]),
        });

        this.currencyExchangeService.fromCurrencies = this.mapItemCurrencies();

        this.currencyExchangeService.toCurrencies = this.mapItemCurrencies();

        this.filteredFromValues = this.getFromValueChanges(FormNames.FromControl);

        this.filteredToValues = this.getToValueChanges(FormNames.ToControl);
    }

    filterSelectedValue(value: string): ExchangeRatesResponse {
        return this.currencyExchangeService.exchangeRates.filter((item: ExchangeRatesResponse) => {
            return item.currency === this.converterForm.get(value).value;
        })[0];
    }

    mapItemCurrencies(): string[] {
        return this.currencyExchangeService.exchangeRates.map(
            (currencyItem: ExchangeRatesResponse) => {
                return currencyItem.currency;
            },
        );
    }

    getFromValueChanges(stringValue: string): Observable<string[]> {
        return this.converterForm.get(stringValue).valueChanges.pipe(
            startWith(''),
            map((value) => this.filterFromInputValue(value)),
        );
    }

    getToValueChanges(stringValue: string): Observable<string[]> {
        return this.converterForm.get(stringValue).valueChanges.pipe(
            startWith(''),
            map((value) => this.filterToInputValue(value)),
        );
    }

    refreshTable() {
        this.dataSource = new MatTableDataSource(
            this.currencyExchangeService.periodicHistoryExchangeRates,
        );
    }

    private filterFromInputValue(value: string): string[] {
        const filterValue = value.toLowerCase();

        return this.currencyExchangeService.fromCurrencies.filter((option) =>
            option.toLowerCase().includes(filterValue),
        );
    }

    private filterToInputValue(value: string): string[] {
        const filterValue = value.toLowerCase();

        return this.currencyExchangeService.toCurrencies.filter((option) =>
            option.toLowerCase().includes(filterValue),
        );
    }
}
