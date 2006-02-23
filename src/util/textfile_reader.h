// (C) David Lawrence released under the GPL (see license.txt)
// Started:       18 Aug 2004
// Last modified: 31 Aug 2004

#ifndef TEXTFILE_READER_H
#define TEXTFILE_READER_H

#include "util/string_util.h"
#include <string>
#include <vector>

/**
 * Reads files from disk.
 * Inherit and implement handle_line to load your file type
 */
class TextFileReader {
public:
    TextFileReader(const std::string f): filename(f) { };
    virtual ~TextFileReader() { };
protected:
    virtual void handle_line(std::string& line) = 0;
    void process(void);
private:
    std::string filename;
};


// This fills a vector of strings with each line from filename
class VectorLineReader : public TextFileReader {
public:
    VectorLineReader(const std::string filename, strings_t* v):
	TextFileReader(filename), vtor(v) {
	process();
    };
protected:
    void handle_line(std::string& line) {
	vtor->push_back(line);
    };
private:
    strings_t* vtor;
};




#endif // TEXTFILE_READER_H

