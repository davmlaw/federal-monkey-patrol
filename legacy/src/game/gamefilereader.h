// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sat Jul  2 23:02:36 2005
// Last modified: Sat Jul  2 23:02:36 2005

#ifndef GAMEFILEREADER_H
#define GAMEFILEREADER_H

#include "util/properties.h"
#include "util/textfile_reader.h"
#include "game/gamemanager.h"

/**
 * Creates GameManager from disk file
 */
class GameFileReader : public TextFileReader {
public:
    GameFileReader::GameFileReader(std::string f, GameManager* g):
	TextFileReader(f), gm(g) {
	process();
    };
    ~GameFileReader() { };
private:
    virtual void handle_line(std::string& line);
    GameManager* gm;
};


#endif // GAMEFILEREADER_H
