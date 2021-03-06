/*!
**  bauer-shell -- Just another wrapper for fs and child_process.
**  Copyright (c) 2014 Yuri Neves Silveira <http://yneves.com>
**  Licensed under The MIT License <http://opensource.org/licenses/MIT>
**  Distributed on <http://github.com/yneves/node-bauer-shell>
*/
// - -------------------------------------------------------------------- - //
// - libs

var lib = {
	fs: require("fs"),
	zlib: require("zlib"),
	path: require("path"),
	stream: require("stream"),
	cp: require("child_process"),
	factory: require("bauer-factory"),
};

// - -------------------------------------------------------------------- - //

var sh = lib.factory.object({

	constructor: function() {
	},

// - -------------------------------------------------------------------- - //

	// .parseJSON(content,callback)
	parseJSON: function(content,callback) {
		try {
			callback(null,JSON.parse(content));
		} catch(error) {
			callback(error);
		}
	},

	// .parseTime(text)
	parseTime: function(text) {
		var suffix = text.substr(-1,1);
		var factor = 0;
		if (suffix == "d") {
			factor = 24 * 60 * 60 * 1000;
		} else if (suffix == "w") {
			factor = 7 * 24 * 60 * 60 * 1000;
		} else if (suffix == "h") {
			factor = 60 * 60 * 1000;
		}
		var period = parseInt(text.substr(0,text.length - 1));
		return period * factor;
	},

// - -------------------------------------------------------------------- - //

	rm: {

		// .rm(list)
		a: function(list) {
			for (var i = 0; i < list.length; i++) {
				this.rm(list[i]);
			}
			return sh;
		},

		// .rm(list,callback)
		af: function(list,callback) {
			var error = [];
			if (list.length == 0) {
				callback(error);
			} else {
				for (var i = 0; i < list.length; i++) {
					this.rm(list[i],function(err) {
						error.push(err);
						if (error.length == list.length) {
							callback(error);
						}
					});
				}
			}
			return sh;
		},

		// .rm(file)
		s: function(file) {
			if (lib.fs.existsSync(file)) {
				lib.fs.unlinkSync(file);
			}
			return sh;
		},

		// .rm(file,callback)
		sf: function(file,callback) {
			lib.fs.unlink(file,callback);
			return sh;
		},

	},

// - -------------------------------------------------------------------- - //

	mk: {

		// .mk(dir)
		s: function(dir) {
			var resolved = lib.path.resolve(dir);
			var parts = resolved.split(lib.path.sep);
			var len = parts.length;
			var path = "";
			for (var i = 0; i < len; i++) {
				path += parts[i] + lib.path.sep;
				if (!lib.fs.existsSync(path)) {
					lib.fs.mkdirSync(path);
				}
			}
			return sh;
		},

		// .mk(dir,callback)
		sf: function(dir,callback) {
			var resolved = lib.path.resolve(dir);
			var parts = resolved.split(lib.path.sep);
			var len = parts.length;
			var path = "";
			var paths = [];
			for (var i = 0; i < len; i++) {
				path += parts[i] + lib.path.sep;
				paths.push(path);
			}
			function recurse() {
				if (paths.length > 0) {
					var path = paths.shift();
					lib.fs.exists(path,function(exists) {
						if (exists) {
							recurse();
						} else {
							lib.fs.mkdir(path,function(error) {
								if (error) {
									callback(error);
								} else {
									recurse();
								}
							})
						}
					});
				} else {
					callback();
				}
			}
			recurse();
			return sh;
		},

		// backward compatibility
		sb: "console.warn('deprecated'); return this.mk(s);",

	},

// - -------------------------------------------------------------------- - //

	mv: {

		// .mv(old,new)
		ss: function(oldpath,newpath) {
			lib.fs.renameSync(oldpath,newpath);
			return sh;
		},

		// .mv(old,new,callback)
		ssf: function(oldpath,newpath,callback) {
			lib.fs.rename(oldpath,newpath,callback);
			return sh;
		},

	},

// - -------------------------------------------------------------------- - //

	ln: {

		// .ln(source,target)
		ss: function(srcpath,target) {
			lib.fs.symlinkSync(srcpath,target);
			return sh;
		},

		ssf: function(srcpath,target,callback) {
			lib.fs.symlink(srcpath,target,callback);
			return sh;
		},

	},

// - -------------------------------------------------------------------- - //

	ls: {

		// .ls(path)
		s: function(path) {
			var files = [];
			lib.fs.readdirSync(path).forEach(function(file) {
				files.push(lib.path.resolve(path,file));
			});
			return files;
		},

		// .ls(path,callback)
		sf: function(path,callback) {
			lib.fs.readdir(path,function(err,files) {
				callback(files.map(function(file) {
					return lib.path.resolve(path,file);
				}));
			});
			return sh;
		},

		// .ls(path,options)
		so: function(path,opts) {
			var list = [];
			var recursive = opts.recursive;
			var ignore = opts.ignore;
			if (lib.factory.isString(ignore)) {
				ignore = ignore.split("\n");
			}
			if (lib.factory.isArray(ignore)) {
				var temp = {};
				ignore.forEach(function(item) { temp[item] = true });
				ignore = temp;
			}
			var items = lib.fs.readdirSync(path);
			for (var i = 0; i < items.length; i++) {
				if (!ignore || !ignore[items[i]]) {
					var item = lib.path.resolve(path,items[i]);
					list.push(item);
					if (recursive) {
						if (sh.isDir(item)) {
							list.push.apply(list,sh.ls(item,opts));
						}
					}
				}
			}
			return list;
		},

		// .ls(path,options,callback)
		sof: function(path,opts,callback) {
			var list = [];
			var recursive = opts.recursive;
			var ignore = opts.ignore;
			if (lib.factory.isString(ignore)) {
				ignore = ignore.split("\n");
			}
			if (lib.factory.isArray(ignore)) {
				var temp = {};
				ignore.forEach(function(item) { temp[item] = true });
				ignore = temp;
			}
			lib.fs.readdir(path,function(error,items) {
				var waiting = 0;
				if (!error) {
					waiting += items.length;
					items.forEach(function(val,i) {
						if (ignore && ignore[val]) {
							waiting--;
						} else {
							var item = lib.path.resolve(path,val);
							list.push(item);
							if (recursive) {
								sh.isDir(item,function(isDir) {
									if (isDir) {
										sh.ls(item,opts,function(error,sublist) {
											list.push.apply(list,sublist);
											waiting--;
											waiting == 0 && callback(error,list);
										});
									} else {
										waiting--;
										waiting == 0 && callback(error,list);
									}
								});
							} else {
								waiting--;
							}
						}
					});
				}
				waiting == 0 && callback(error,list);
			});
			return sh;
		},

	},

// - -------------------------------------------------------------------- - //

	dirs: {

		// .dirs(path)
		s: "return this.dirs(this.ls(s));",

		// .dirs(path,callback)
		sf: function(path,callback) {
			sh.ls(path,function(list) {
				sh.dirs(list,callback);
			});
			return sh;
		},

		// .dirs(list)
		a: function(list) {
			var dirs = [];
			for (var i = 0; i < list.length; i++) {
				if (sh.isDir(list[i])) {
					dirs.push(list[i]);
				}
			}
			return dirs;
		},

		// .dirs(list,callback)
		af: function(list,callback) {
			var dirs = [];
			var waiting = list.length;
			list.forEach(function(item) {
				sh.isDir(item,function(isDir) {
					if (isDir) {
						dirs.push(item);
					}
					waiting--;
					waiting == 0 && callback(dirs);
				});
			});
			return sh;
		},

	},

	files: {

		// .files(path)
		s: "return this.files(this.ls(s));",

		// .files(path,callback)
		sf: function(path,callback) {
			sh.ls(path,function(list) {
				sh.files(list,callback);
			});
			return sh;
		},

		// .files(list)
		a: function(list) {
			var files = [];
			for (var i = 0; i < list.length; i++) {
				if (sh.isFile(list[i])) {
					files.push(list[i]);
				}
			}
			return files;
		},

		// .files(list,callback)
		af: function(list,callback) {
			var files = [];
			var waiting = list.length;
			list.forEach(function(item) {
				sh.isFile(item,function(isFile) {
					if (isFile) {
						files.push(item);
					}
					waiting--;
					waiting == 0 && callback(files);
				});
			});
			return sh;
		},

	},

	links: {

		// .links(path)
		s: "return this.links(this.ls(s));",

		// .links(path,callback)
		sf: function(path,callback) {
			sh.ls(path,function(list) {
				sh.links(list,callback);
			});
			return sh;
		},

		// .links(list)
		a: function(list) {
			var links = [];
			for (var i = 0; i < list.length; i++) {
				if (sh.isLink(list[i])) {
					links.push(list[i]);
				}
			}
			return links;
		},

		// .links(list,callback)
		af: function(list,callback) {
			var links = [];
			var waiting = list.length;
			list.forEach(function(item) {
				sh.isLink(item,function(isLink) {
					if (isLink) {
						links.push(item);
					}
					waiting--;
					waiting == 0 && callback(links);
				});
			});
			return sh;
		},

	},

// - -------------------------------------------------------------------- - //

	cp: {

		// .cp(source,target)
		ss: "return this.cp(s0,s1,{})",

		// .cp(source,target,options)
		sso: function(source,target,opts) {
			if (sh.isDir(source)) {
				sh.exists(target) || sh.mk(target,true);
				var list = sh.ls(source,opts);
				var len = list.length;
				for (var i = 0; i < len; i++) {
					this.cp(list[i],lib.path.resolve(target,lib.path.basename(list[i])));
				}
			} else if (this.isFile(source)) {
				var BUF_LENGTH, buff, bytesRead, fdr, fdw, pos;
				BUF_LENGTH = 64 * 1024;
				buff = new Buffer(BUF_LENGTH);
				fdr = lib.fs.openSync(source, "r");
				fdw = lib.fs.openSync(target, "w");
				bytesRead = 1;
				pos = 0;
				while (bytesRead > 0) {
					bytesRead = lib.fs.readSync(fdr, buff, 0, BUF_LENGTH, pos);
					lib.fs.writeSync(fdw, buff, 0, bytesRead);
					pos += bytesRead;
				}
				lib.fs.closeSync(fdr);
				lib.fs.closeSync(fdw);
			} else if (this.isLink(source)) {
				var srcpath = lib.fs.readlinkSync(source);
				lib.fs.symlinkSync(srcpath,target);
			}
			return sh;
		},

	},

// - -------------------------------------------------------------------- - //

	// .cwd()
	cwd: "return process.cwd();",

// - -------------------------------------------------------------------- - //

	exists: {

		// .exists(file)
		s: function(file) {
			return lib.fs.existsSync(file);
		},

		// .exists(file,callback)
		sf: function(file,callback) {
			lib.fs.exists(file,callback);
			return sh;
		},

	},

// - -------------------------------------------------------------------- - //

	isDir: {

		// .isDir(path)
		s: function(path) {
			var isDir = false;
			if (this.exists(path)) {
				var stat = lib.fs.lstatSync(path);
				if (stat) {
					if (stat.isDirectory() && !stat.isSymbolicLink()) {
						isDir = true;
					}
				}
			}
			return isDir;
		},

		// .isDir(path,callback)
		sf: function(path,callback) {
			sh.exists(path,function(exists) {
				lib.fs.lstat(path,function(error,stat) {
					var isDir = false;
					if (stat) {
						if (stat.isDirectory() && !stat.isSymbolicLink()) {
							isDir = true;
						}
					}
					callback(isDir);
				});
			});
			return sh;
		},

	},

	isFile: {

		// .isFile(path)
		s: function(path) {
			var isFile = false;
			if (this.exists(path)) {
				var stat = lib.fs.lstatSync(path);
				if (stat) {
					if (stat.isFile() && !stat.isSymbolicLink()) {
						isFile = true;
					}
				}
			}
			return isFile;
		},

		// .isDir(path,callback)
		sf: function(path,callback) {
			sh.exists(path,function(exists) {
				lib.fs.lstat(path,function(error,stat) {
					var isFile = false;
					if (stat) {
						if (stat.isFile() && !stat.isSymbolicLink()) {
							isFile = true;
						}
					}
					callback(isFile);
				});
			});
			return sh;
		},

	},

	isLink: {

		// .isLink(path)
		s: function(path) {
			var isLink = false;
			if (this.exists(path)) {
				var stat = lib.fs.lstatSync(path);
				if (stat) {
					if (stat.isSymbolicLink()) {
						isLink = true;
					}
				}
			}
			return isLink;
		},

		// .isLink(path,callback)
		sf: function(path,callback) {
			sh.exists(path,function(exists) {
				lib.fs.lstat(path,function(error,stat) {
					var isLink = false;
					if (stat) {
						if (stat.isSymbolicLink()) {
							isLink = true;
						}
					}
					callback(isDir);
				});
			});
			return sh;
		},

	},

// - -------------------------------------------------------------------- - //

	stat: {

		// .stat(file)
		s: function(file) {
			return lib.fs.statSync(file);
		},

		// .stat(file,callback)
		sf: function(file,callback) {
			return lib.fs.stat(file,callback);
		},

	},

// - -------------------------------------------------------------------- - //

	size: {

		// .size(file)
		s: function(file) {
			var stat = lib.fs.statSync(file);
			return stat.size;
		},

		// .size(file,callback)
		sf: function(file,callback) {
			lib.fs.stat(file,function(err,stat) {
				if (error) {
					callback(error);
				} else {
					callback(null,stat.size);
				}
			});
			return sh;
		},

	},

// - -------------------------------------------------------------------- - //

	date: {

		// .date(file)
		s: function(file) {
			var stat = lib.fs.statSync(file);
			return stat.mtime;
		},

		// .date(file,callback)
		sf: function(file,callback) {
			lib.fs.stat(file,function(error,stat) {
				if (error) {
					callback(error);
				} else {
					callback(null,stat.mtime);
				}
			});
			return sh;
		},

	},

// - -------------------------------------------------------------------- - //

	modified: {

		// .modified(file,text)
		ss: function(file,text) {
			var date = new Date();
			var time = sh.parseTime(text);
			date.setTime(date.getTime() - time)
			sh.modified(file,date);
			return sh;
		},

		// .modified(file,text)
		ssf: function(file,since,callback) {
			var date = new Date();
			var time = sh.parseTime(text);
			date.setTime(date.getTime() - time)
			sh.modified(file,date,callback);
			return sh;
		},

		// .modified(file,ms)
		sn: function(file,ms) {
			var date = new Date();
			date.setTime(date.getTime() - ms);
			return sh.modified(file,date);
		},

		// .modified(file,ms,callback)
		snf: function(file,ms,callback) {
			var date = new Date();
			date.setTime(date.getTime() - ms);
			return sh.modified(file,date,callback);
		},

		// .modified(file,date)
		sd: function(file,date) {
			var stats = lib.fs.statSync(file);
			return stats.mtime < date;
		},

		// .modified(file,date,callback)
		sdf: function(file,date,callback) {
			lib.fs.stat(file,function(error,stats) {
				if (error) {
					callback(error);
				} else {
					callback(null,stats.mtime < date)
				}
			});
			return sh;
		},

	},

// - -------------------------------------------------------------------- - //

	json: {

		// .json(file)
		s: function(file) {
			var content = lib.fs.readFileSync(file,"utf8");
			return JSON.parse(content);
		},

		// .json(file,defaults)
		so: function(file,defaults) {
			if (lib.fs.existsSync(file)) {
				var content = lib.fs.readFileSync(file,"utf8");
				return JSON.parse(content);
			} else {
				return defaults;
			}
		},

		// .json(file,defaults)
		sa: function(file,defaults) {
			if (lib.fs.existsSync(file)) {
				var content = lib.fs.readFileSync(file,"utf8");
				return JSON.parse(content);
			} else {
				return defaults;
			}
		},

		// .json(file,callback)
		sf: function(file,callback) {
			lib.fs.exists(file,function(exists) {
				if (exists) {
					lib.fs.readFile(file,"utf8",function(error,content) {
						if (error) {
							callback(error);
						} else {
							sh.parseJSON(content,callback);
						}
					});
				} else {
					callback(new Error("file not found"));
				}
			});
		},

		// .json(file,defaults,callback)
		sof: function(file,defaults,callback) {
			lib.fs.exists(file,function(exists) {
				if (exists) {
					lib.fs.readFile(file,function(error,content) {
						if (error) {
							callback(error);
						} else {
							sh.parseJSON(content,callback);
						}
					});
				} else {
					callback(null,defaults);
				}
			});
		},

		// .json(file,defaults,callback)
		saf: function(file,defaults,callback) {
			lib.fs.exists(file,function(exists) {
				if (exists) {
					lib.fs.readFile(file,function(error,content) {
						if (error) {
							callback(error);
						} else {
							sh.parseJSON(content,callback);
						}
					});
				} else {
					callback(null,defaults);
				}
			});
		},

	},

// - -------------------------------------------------------------------- - //

	gzip: {

		// .gzip(file,callback)
		sf: function(file,callback) {
			lib.fs.exists(file,function(exists) {
				if (exists) {
					var readable = lib.fs.createReadStream(file);
					var gunzip = lib.zlib.createGunzip();
					readable.pipe(gunzip);
					readable.on("error",callback);
					gunzip.on("error",callback);
					var data = "";
					gunzip.on("data",function(chunk) {
						data += chunk.toString("utf8");
					});
					gunzip.on("end",function() {
						callback(null,data);
					});
				}
			});
			return sh;
		},

	},

// - -------------------------------------------------------------------- - //

	deflate: {

		// .deflate(file,callback)
		sf: function(file,callback) {
			lib.fs.exists(file,function(exists) {
				if (exists) {
					var readable = lib.fs.createReadStream(file);
					var inflate = lib.zlib.createInflate();
					readable.pipe(inflate);
					readable.on("error",callback);
					inflate.on("error",callback);
					var data = "";
					inflate.on("data",function(chunk) {
						data += chunk.toString("utf8");
					});
					inflate.on("end",function() {
						callback(null,data);
					});
				}
			});
			return sh;
		},

	},

// - -------------------------------------------------------------------- - //

	read: {

		// .read(file)
		s: function(file) {
			var data = lib.fs.readFileSync(file,"utf8");
			return data;
		},

		// .read(file,callback)
		sf: function(file,callback) {
			lib.fs.readFile(file,"utf8",callback);
			return sh;
		},

	},

// - -------------------------------------------------------------------- - //

	write: {

		// .write(file,object)
		so: "return this.write(s,JSON.stringify(o,null,2))",

		// .write(file,object,callback)
		sof: "return this.write(s,JSON.stringify(o,null,2),f)",

		// .write(file,array)
		sa: "return this.write(s,JSON.stringify(a,null,2))",

		// .write(file,array,callback)
		saf: "return this.write(s,JSON.stringify(a,null,2),f)",

		// .write(file,error)
		se: "return this.write(s,e.toString()+' - '+e.stack.toString());",

		// .write(file,error,callback)
		sef: "return this.write(s,e.toString()+' - '+e.stack.toString(),f);",

		// .write(file,content)
		ss: function(file,content) {
			var dir = lib.path.dirname(file);
			if (!lib.fs.existsSync(dir)) {
				sh.mk(dir);
			}
			lib.fs.writeFileSync(file,content);
			return sh;
		},

		// .write(file,content,callback)
		ssf: function(file,content,callback) {
			var dir = lib.path.dirname(file);
			lib.fs.exists(dir,function(exists) {
				if (!exists) {
					sh.mk(dir);
				}
				lib.fs.writeFile(file,content,callback);
			});
			return sh;
		},

	},

// - -------------------------------------------------------------------- - //

	append: {

		// .append(file,object)
		so: "return this.append(s,JSON.stringify(o,null,2))",

		// .append(file,object,callback)
		sof: "return this.append(s,JSON.stringify(o,null,2),f)",

		// .append(file,array)
		sa: "return this.append(s,JSON.stringify(a,null,2))",

		// .append(file,array,callback)
		saf: "return this.append(s,JSON.stringify(a,null,2),f)",

		// .append(file,error)
		se: "return this.append(s,e.toString()+' - '+e.stack.toString());",

		// .append(file,error,callback)
		sef: "return this.append(s,e.toString()+' - '+e.stack.toString(),f);",

		// .append(file,content)
		ss: function(file,content) {
			var dir = lib.path.dirname(file);
			if (!lib.fs.existsSync(dir)) {
				sh.mk(dir);
			}
			lib.fs.appendFileSync(file,content);
			return sh;
		},

		// .append(file,content,callback)
		ssf: function(file,content,callback) {
			var dir = lib.path.dirname(file);
			lib.fs.exists(dir,function(exists) {
				if (!exists) {
					sh.mk(dir);
				}
				lib.fs.appendFile(file,content,callback);
			});
			return sh;
		},

	},

// - -------------------------------------------------------------------- - //

	pipe: {

		// .pipe(read,write,callback)
		ssf: function(read,write,callback) {
			var readable = lib.fs.createReadStream(read);
			sh.pipe(readable,write,callback);
			return sh;
		},

		// .pipe(readable,write,callback)
		osf: function(readable,write,callback) {
			var dir = lib.path.dirname(write);
			lib.fs.exists(dir,function(exists) {
				if (exists) {
					var writable = lib.fs.createWriteStream(write);
					sh.pipe(readable,writable,callback);
				} else {
					sh.mk(dir,function(error) {
						if (error) {
							callback(error);
						} else {
							var writable = lib.fs.createWriteStream(write);
							sh.pipe(readable,writable,callback);
						}
					});
				}
			})
			return sh;
		},

		// .pipe(read,writable,callback)
		sof: function(read,writable,callback) {
			var readable = lib.fs.createReadStream(read);
			sh.pipe(readable,writable,callback);
			return sh;
		},

		// .pipe(readable,writable,callback)
		oof: function(readable,writable,callback) {
			if (!readable instanceof lib.stream.Readable) {
				throw new Error("not a readable stream");
			}
			if (!writable instanceof lib.stream.Writable) {
				throw new Error("not a writable stream");
			}
			readable.pipe(writable);
			readable.on("error",callback);
			readable.on("end",callback);
			return sh;
		},

	},

// - -------------------------------------------------------------------- - //

	fork: {

		// .fork(cmd)
		s: "return this.fork({ cmd: s },function() {})",

		// .fork(cmd,callback)
		sf: "return this.fork({ cmd: s },f)",

		// .fork(cmd,args)
		sa: "return this.fork({ cmd: s, args: a },function() {})",

		// .fork(cmd,args,callback)
		saf: "return this.fork({ cmd: s, args: a },f)",

		// .fork(options)
		o: "return this.fork(o,function() {})",

		// .fork(options,callback)
		of: function(options,callback) {
			var error = null;
			var proc = lib.cp.fork(options.cmd,options.args,options.opts);
			proc.on("exit",function(code,signal) {
				if (code !== 0) {
					error = new Error(signal);
				}
				var results = {
					code: code
				};
				return callback(error,results,code);
			});
			return proc;
		},

	},

// - -------------------------------------------------------------------- - //

	spawn: {

		// .spawn(cmd)
		s: "return this.spawn({ cmd: s },function() {})",

		// .spawn(cmd,callback)
		sf: "return this.spawn({ cmd: s },f)",

		// .spawn(cmd,args)
		sa: "return this.spawn({ cmd: s, args: a },function() {})",

		// .spawn(cmd,args,callback)
		saf: "return this.spawn({ cmd: s, args: a },f)",

		// .spawn(options)
		o: "return this.spawn(o,function() {})",

		// .spawn(options,callback)
		of: function(options,callback) {
	    var stdout = [];
	    var stderr = [];
	    var error = null;
	    var proc = lib.cp.spawn(options.cmd,options.args,options.opts);
	    proc.stdout.on("data",function(data) {
	      return stdout.push(data.toString());
	    });
	    proc.stderr.on("data",function(data) {
	      return stderr.push(data.toString());
	    });
	    proc.on("exit",function(code,signal) {
	      if (code !== 0) {
	        error = new Error(signal);
	      }
	      var results = {
	        stderr: stderr.join(""),
	        stdout: stdout.join(""),
	        code: code
	      };
	      return callback(error,results,code);
	    });
			return proc;
		},

  },

// - -------------------------------------------------------------------- - //

	exec: {

		// .exec(cmd)
		s: "return this.exec({ cmd: s },function() {})",

		// .exec(cmd,callback)
		sf: "return this.exec({ cmd: s },f)",

		// .exec(cmd,args)
		sa: "return this.exec({ cmd: s, args: a },function() {})",

		// .exec(cmd,args,callback)
		saf: "return this.exec({ cmd: s, args: a },f)",

		// .exec(options)
		o: "return this.exec(o,function() {})",

		// .exec(options,callback)
		of: function(options,callback) {
			var stdout = [];
			var stderr = [];
			var error = null;
			var proc = lib.cp.exec(options.cmd,options.args,options.opts);
			proc.stdout.on("data",function(data) {
				return stdout.push(data.toString());
			});
			proc.stderr.on("data",function(data) {
				return stderr.push(data.toString());
			});
			proc.on("exit",function(code,signal) {
				if (code !== 0) {
					error = new Error(signal);
				}
				var results = {
					stderr: stderr.join(""),
					stdout: stdout.join(""),
					code: code
				};
				return callback(error,results,code);
			});
			return proc;
		},

	},

// - -------------------------------------------------------------------- - //

	execFile: {

		// .execFile(cmd)
		s: "return this.execFile({ cmd: s },function() {})",

		// .execFile(cmd,callback)
		sf: "return this.execFile({ cmd: s },f)",

		// .execFile(cmd,args)
		sa: "return this.execFile({ cmd: s, args: a },function() {})",

		// .execFile(cmd,args,callback)
		saf: "return this.execFile({ cmd: s, args: a },f)",

		// .execFile(options)
		o: "return this.execFile(o,function() {})",

		// .execFile(options,callback)
		of: function(options,callback) {
			var stdout = [];
			var stderr = [];
			var error = null;
			var proc = lib.cp.execFile(options.cmd,options.args,options.opts);
			proc.stdout.on("data",function(data) {
				return stdout.push(data.toString());
			});
			proc.stderr.on("data",function(data) {
				return stderr.push(data.toString());
			});
			proc.on("exit",function(code,signal) {
				if (code !== 0) {
					error = new Error(signal);
				}
				var results = {
					stderr: stderr.join(""),
					stdout: stdout.join(""),
					code: code
				};
				return callback(error,results,code);
			});
			return proc;
		},

	},

});

// - -------------------------------------------------------------------- - //

module.exports = sh;

// - -------------------------------------------------------------------- - //
