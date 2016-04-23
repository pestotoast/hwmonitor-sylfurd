/*
Copyright 2012 Renaud Delcoigne (Aka Sylfurd)

This file is part of HWMonitor

HWMonitor is free software: you can redistribute it and/or modify it under the
terms of the GNU General Public License as published by the Free Software
Foundation, either version 3 of the License, or (at your option) any later
version.

Foobar is distributed in the hope that it will be useful, but WITHOUT ANY
WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
FOR A PARTICULAR PURPOSE. See the GNU General Public License for more
details.

You should have received a copy of the GNU General Public License along
with Foobar. If not, see http://www.gnu.org/licenses/.
*/

const Applet = imports.ui.applet;
const Cinnamon = imports.gi.Cinnamon;
const GTop = imports.gi.GTop;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const PopupMenu = imports.ui.popupMenu;
const St = imports.gi.St;
const Cairo = imports.cairo;
const Settings = imports.ui.settings;
const Main = imports.ui.main;

const graph_width = 144;
const graph_count = 3;
const panel_height = 20;

var update_ms = 1000;
var net_kbyte_per_sec_max = 4095;
var network_card_name = "offline";
var secondary_card = "enp3s031f6";
var primary_card = "wlp3s0";
var debug = false;

function MyApplet(metadata, orientation, instanceId) {
	this._init(metadata, orientation, instanceId);
}

MyApplet.prototype = {
	__proto__: Applet.Applet.prototype,

	_init: function(metadata, orientation, instanceId) {
		Applet.Applet.prototype._init.call(this, orientation, instanceId);	

		try {
			this.itemOpenSysMon = new PopupMenu.PopupMenuItem("Open System Monitor");
			this.itemOpenSysMon.connect('activate', Lang.bind(this, this._runSysMonActivate));

            this._init_settings(instanceId);

			this.graphArea = new St.DrawingArea();
			this.graphArea.width = graph_width * graph_count
			this.graphArea.connect('repaint', Lang.bind(this, this.onGraphRepaint));

			this.actor.add_actor(this.graphArea);

			let cpuProvider =  new CpuDataProvider();
			let memProvider =  new MemDataProvider();
			let netProvider =  new NetDataProvider();

			let cpuGraph = new Graph(this.graphArea, cpuProvider);
			let memGraph = new Graph(this.graphArea, memProvider);
                        let netGraph = new Graph(this.graphArea, netProvider);

			this.graphs = new Array();
			this.graphs[0] = cpuGraph;
			this.graphs[1] = memGraph;
                        this.graphs[2] = netGraph;
			this._update();
		}
		catch (e) {
			global.logError(e);
		}
	},

	_init_settings: function(instanceId) {
	    this._applet_context_menu.addMenuItem(this.itemOpenSysMon);

        this.settings = new Settings.AppletSettings(this, "hwmonitor@sylfurd", instanceId);

        this.settings.bindProperty(Settings.BindingDirection.IN,
                               "option_update_ms",
                               "option_update_ms",
                               this.on_settings_changed,
                               null);

        this.settings.bindProperty(Settings.BindingDirection.IN,
                               "option_primary_card",
                               "option_primary_card",
                               this.on_settings_changed,
                               null);

        this.settings.bindProperty(Settings.BindingDirection.IN,
                               "option_secondary_card",
                               "option_secondary_card",
                               this.on_settings_changed,
                               null);

        this.settings.bindProperty(Settings.BindingDirection.IN,
                               "option_net_kbyte_per_sec_max",
                               "option_net_kbyte_per_sec_max",
                               this.on_settings_changed,
                               null);
        this.settings.bindProperty(Settings.BindingDirection.IN,
                               "option_debug",
                               "option_debug",
                               this.on_settings_changed,
                               null);
        this._setOptions();
	},

	on_applet_clicked: function(event) {
		global.log("hwmonitor_clicked");
		this._runSysMon();
	},

	on_settings_changed : function() {
	        global.log("settings changed");
			this._setOptions();
    	},
	
	_setOptions: function() {
		net_kbyte_per_sec_max = this.option_net_kbyte_per_sec_max;
		secondary_card = this.option_secondary_card;
		primary_card = this.option_primary_card;
		update_ms = this.option_update_ms;
		debug = this.option_debug;
	},
	_runSysMonActivate: function() {
		this._runSysMon();
	},

	_update: function() {

		for (i = 0; i < this.graphs.length; i++)
		{
			this.graphs[i].refreshData();
		}
		this.graphArea.queue_repaint();

		Mainloop.timeout_add(update_ms, Lang.bind(this, this._update));
	},

	_runSysMon: function() {
		let _appSys = Cinnamon.AppSystem.get_default();
		let _gsmApp = _appSys.lookup_app('gnome-system-monitor.desktop');
		_gsmApp.activate();
	},

	onGraphRepaint: function(area) {
		try {
			for (index = 0; index < this.graphs.length; index++)
			{
				if (index == 0)
				{
					area.get_context().translate(0, 0);
					this.graphs[index].paint(area);
				} else {
					area.get_context().translate(graph_width + 1, 0);
					this.graphs[index].paint(area);
				}
			}
		}catch(e)
		{
			global.logError(e);
		}
	}
};

function Graph(area, provider) {
	this._init(area, provider);
}

Graph.prototype = {
	
	_init: function(_area, _provider) {
		this.width = graph_width -3;
		let [w, h] = _area.get_surface_size();
		this.datas = new Array(this.width);

		for (i = 0; i <this.datas.length; i++)
        {
        	this.datas[i] = 0;
        }

		this.height = panel_height;
		this.provider = _provider;

	},

	paint: function(area)
	{
		let cr = area.get_context();

        // Datas
        cr.setLineWidth(0);
        cr.moveTo(1, this.height - this.datas[0]);

        for (i = 1; i <this.datas.length; i++)
        {
        	cr.lineTo(1+i, this.height - this.datas[i]);
        }

    	cr.lineTo(this.datas.length, this.height);
    	cr.lineTo(1, this.height);

    	cr.closePath();

        pattern = new Cairo.LinearGradient(0, 0, 0, this.height);
        cr.setSource(pattern);
        pattern.addColorStopRGBA(0, 1, 0, 0, 1);
        pattern.addColorStopRGBA(0.5, 1, 1, 0.2, 1);
        pattern.addColorStopRGBA(0.7, 0.4, 1, 0.3, 1);
        pattern.addColorStopRGBA(1, 0.2, 0.7, 1, 1);
        
        cr.fill();

        // Label
		cr.setFontSize(8);
        cr.setSourceRGBA(0, 0, 0, 0.5);
		cr.moveTo(2.5, 11.5);
		cr.showText(this.provider.getName());
        cr.setSourceRGBA(1, 1, 1, 1);
		cr.moveTo(2, 11);
		cr.showText(this.provider.getName());

	},

	refreshData: function()
	{
		let data = this.provider.getData()*(this.height-1);

		if (this.datas.push(data)>this.width-2)
		{
			this.datas.shift();
		}
	}
	
};

function CpuDataProvider() {
	this._init();
}

CpuDataProvider.prototype = {
	
	_init: function(){
		this.gtop = new GTop.glibtop_cpu();
		this.current = 0;
		this.last = 0;
		this.usage = 0;
		this.last_total = 0;		
	},

	getData: function()
	{
		GTop.glibtop_get_cpu(this.gtop);

		this.current = this.gtop.idle;

		let delta = (this.gtop.total - this.last_total);
		if (delta > 0) {
			this.usage =(this.current - this.last) / delta;
			this.last = this.current;

			this.last_total = this.gtop.total;
		}

		return 1-this.usage;
	},

	getName: function()
	{
		return "CPU";
	}
};

function MemDataProvider() {
	this._init();
}

MemDataProvider.prototype = {
	
	_init: function(){
			this.gtopMem = new GTop.glibtop_mem();
	},

	getData: function()
	{
		GTop.glibtop_get_mem(this.gtopMem);

		return 1 - (this.gtopMem.buffer + this.gtopMem.cached + this.gtopMem.free) / this.gtopMem.total;
	},

	getName: function()
	{
		return "MEM";
	}
};


function NetDataProvider() {
	this._init();
}

NetDataProvider.prototype = {
	
	_init: function(){
	//this.gtopNet = new GTop.glibtop_netload();
	this.gtopEth = new GTop.glibtop_netload();
	this.gtopprimary_card = new GTop.glibtop_netload();		

        // Set initial data
        GTop.glibtop_get_netload(this.gtopprimary_card, primary_card);
	this.bytes_out_current = 0;
	this.bytes_in_current = 0;
	this.bytes_total_current = 0;

  	this.bytes_out_last   = this.gtopprimary_card.bytes_out;
	this.bytes_in_last    = this.gtopprimary_card.bytes_in;
	this.bytes_total_last = this.gtopprimary_card.bytes_total;
	this.usage = 0;
	},

	getData: function()
	{
		try 
		{
			let gtop;
			GTop.glibtop_get_netload(this.gtopEth, secondary_card);
			let secondary_card_address = this.gtopEth.address;
			if(secondary_card_address != 0)
			{
				gtop = this.gtopEth;
				network_card_name = secondary_card
			}

			GTop.glibtop_get_netload(this.gtopprimary_card, primary_card);
			let primary_card_adress = this.gtopprimary_card.address;
			if(primary_card_adress != 0)
			{
				gtop = this.gtopprimary_card;
				network_card_name = String(primary_card);
			}

			this.bytes_out_current   = gtop.bytes_out;
			this.bytes_in_current    = gtop.bytes_in;
			this.bytes_total_current = gtop.bytes_total;

			// This will be shown, set to total in for now.
			this.usage               = this.bytes_total_current - this.bytes_total_last;

			// Buffer current values
			this.bytes_out_last   = this.bytes_out_current;
			this.bytes_in_last    = this.bytes_in_current;
			this.bytes_total_last = this.bytes_total_current;	
		}
		catch(e)
		{
			global.log(e);
		}

    let usage_kbyte_per_sec = (this.usage / update_ms) *  1.024 ; // transform bytes per tick into kbyte/s

    let result = usage_kbyte_per_sec / net_kbyte_per_sec_max; // project onto [0..1] scale

    if (debug) {
        global.log("Result is " + result + "usage is " + this.usage);
    }

    return result > 1 ? 1 : result; // 1 is 100% (maximum displayed.)
	},

	getName: function()
	{
		return String(network_card_name);
	}
};

function main(metadata, orientation, instanceId) {
	let myApplet = new MyApplet(metadata, orientation, instanceId);
	return myApplet;
}
