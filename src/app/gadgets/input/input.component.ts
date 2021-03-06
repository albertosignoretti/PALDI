import { Component, OnInit, Input } from '@angular/core';
import { Gadget } from 'app/core/gadget';

@Component({
  selector: 'app-input',
  templateUrl: './input.component.html',
  styleUrls: ['./input.component.css']
})
export class InputComponent implements OnInit {
  @Input() gadget: Gadget;

  constructor() { }

  ngOnInit() {
  }

  ngAfterViewInit() {
    this.gadget.setReady();
  }
}
