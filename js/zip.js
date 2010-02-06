/* Low-rent random-access IO */
var IOBuffer = function (str) {
  this.pos = 0;

  this.length = str.length;

  this.read = function (bytes) {
    var chars = str.substr(this.pos, bytes);
    this.pos += bytes;
    return chars;
  }
  this.readByte = this.read;

  this.eof = function () {
    return (this.pos >= this.length);
  }

  this.seek = function (newPos) {
    this.pos = newPos;
  }

  this.lastIndexOf = function (matchStr) {
    return str.lastIndexOf(matchStr);
  }
};

var Zip = {

  /* Archive. A ZIP File. */
  Archive: function (archive) {

    // Store the raw content of the ZIP
    var io = new IOBuffer(archive);
    var directoryIndex = new Zip.CentralDirectory(io);

    // We store pointers filename -> Entry
    this.entries = directoryIndex.entries;
    this.files   = directoryIndex.files;
  },

  CentralDirectory: function (io) {

    // Save our current position
    var prev_pos = io.pos;

    // Find the end-of-central-directory record.
    var offset = io.lastIndexOf(String.fromCharCode(0x50, 0x4b, 0x05, 0x06));

    // The directory index is at most 18 bytes for the header,
    // and 65536 bytes for the zip comment.
    if (offset < io.length - (18 + 65536)) {
      throw new Error("Invalid Zip File.");
    }

    // Go to the start of the end-of-central directory record, read it,
    // and then unpack it into our header.
    io.seek(offset);
    var header = io.read(22).unpack('VvvvvVVv');

    var signature             = header[0],
        numOfThisDisk         = header[1],
        numOfFirstDisk        = header[2],
        numberOfEntriesOnDisk = header[3],
        numberOfEntries       = header[4],
        centralDirectorySize  = header[5],
        centralDirectoryOffset= header[6],
        commentLength         = header[7];

    // Read the ZIP comment, if any.
    this.zipComment = io.read(commentLength);

    if (!io.eof) {
      throw new Error("Unexpected extra data at the end of the Zip File.");
    }

    if (numberOfEntriesOnDisk != numberOfEntries) {
      throw new Error("Multiple disk ZIP volumes are not supported.");
      // That said, you should be commended for using 5.25" floppies post-2010.
      //
      // and in JavaScript.
      //
      // Whrrrr-grind-grind-tsk-tsk-tsk-tsk-whrrr
    }

    // Since we're responsible for reading the Central Directory, we handle the
    // IO positioning to start and finish.
    io.seek(centralDirectoryOffset);
    var i = numberOfEntries;

    this.entries = [];
    this.files = {};

    while (i--) {
      var entry = new Zip.CentralDirectoryEntry(io);
      this.entries.push(entry);
      this.files[entry.name] = entry;
    }

    // Restore our original position.
    io.seek(prev_pos);
  },

  CentralDirectoryEntry: function (io) {

    var rawHeader = io.read(46);
    header = rawHeader.unpack('VCCvvvvvVVVvvvvvVV');

    var signature              = header[0],
        version                = header[1],
        fsType                 = header[2],
        versionNeededToExtract = header[3],
        gpFlags                = header[4],
        compressionMethod      = header[5],
        lastModTime            = header[6],
        lastModDate            = header[7],
        crc                    = header[8],
        compressedSize         = header[9],
        uncompressedSize       = header[10],
        nameLength             = header[11],
        extraLength            = header[12],
        commentLength          = header[13],
        diskNumberStart        = header[14],
        internalFileAttr       = header[15],
        externalFileAttr       = header[16],
        localHeaderOffset      = header[17],
        extra,
        comment,
        fileContent,
        isDirectory,
        entry;

    if (signature != 0x02014b50) {
      throw new Error("Invalid directory entry.");
    }
    
    this.name = io.read(nameLength);
    extra = io.read(extraLength);
    this.comment = io.read(commentLength);

    fileContent = (internalFileAttr & 0x01 == 1) ? 'ascii' : 'binary';

    if (internalFileAttr & 0x02 == 1) {
      throw new Error("This library can't handle mainframe ZIP files.");
      // My sincerest apologies if you're running this on VAX or Z/OS and
      // trying to extract a ZIP archive that uses this neglected format.
      // Patches are welcome!
    }

    this.isDirectory = (this.name.charAt(this.name.length-1) == '/');

    entry = new Zip.Entry(io, localHeaderOffset);
    this.content = entry.content;
  },

  /* Entry. A file (or directory) within a ZIP Archive */
  Entry: function (io, startOffset) {

    // Seek to the beginning of this entry.
    var prev_pos = io.pos;
    io.seek(startOffset);

    var rawHeader = io.read(30);
    var header = rawHeader.unpack('VCCvvvvVVVvv');

    var signature         = header[0],
        version           = header[1],
        fstype            = header[2],
        gpFlags           = header[3],
        compressionMethod = header[4],
        lastModTime       = header[5],
        lastModDate       = header[6],
        crc               = header[7],
        compressedSize    = header[8],
        uncompressedSize  = header[9],
        nameLength        = header[10],
        extraLength       = header[11],
        contentOffset     = startOffset + 30 + nameLength + extraLength,
        name,
        extra,
        content;

    // Each file entry begins with 'PK'
    if (signature != 0x04034B50) {
      throw new Error("Invalid entry");
    }

    name = io.read(nameLength);
    extra = io.read(extraLength);

    this.name = name;

    // We don't pre-extract the content until the user asks for it.
    this.content = function () {

      return function () {
        if (content) return content;

        io.seek(contentOffset);
        var compressedData = io.read(compressedSize);

        switch (compressionMethod) {
          case 0:
            content = compressedData;
            break;
          case 8:
            content = RawDeflate.inflate(compressedData);
            break;
          default:
            throw new Error("Unsupported compression method.");
        }

        return content;
      };
    }();

    // Restore our original position.
    io.seek(prev_pos);
  }
};

/* unpack, like the perl/ruby/python/php method.
   VERY primitive implementation, just what I need for ZIP. */
String.prototype.unpack = function(unpack_cmd) {
  var cmds = unpack_cmd.split('');
  var l = cmds.length;

  var pos = 0;
  var ppos = 0;

  var out = [];
  
  var i = 0;
  while (i < l) {
    switch (cmds[i++]) {
      case "V":
        // Unsigned long (32-bit), little endian.
        var v =( (this.charCodeAt(pos++) & 0xFF)        | 
                ((this.charCodeAt(pos++) & 0xFF) <<  8) |
                ((this.charCodeAt(pos++) & 0xFF) << 16) |
                ((this.charCodeAt(pos++) & 0xFF) << 24) );
        if (v < 0) v += 4294967296;
        out.push(v);
        break;
      case "v":
        // Unsigned short (16-bit), little endian.
        out.push( (this.charCodeAt(pos++) & 0xFF) |
                 ((this.charCodeAt(pos++) & 0xFF) << 8));
        break;
      case "C":
        out.push(this.charCodeAt(pos++));
        break;
      case 'c':
        // Signed char (8-bit)
        var char = this.charCodeAt(pos++);
        out.push(-1 * (char & 128) + (char & 127));
        break;
    }
  }

  return out;
};
