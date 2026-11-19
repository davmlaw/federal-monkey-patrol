// (C) David Lawrence released under the GPL (see license.txt)
// Started:       21 Aug 2004
// Last modified: 21 Aug 2004

#ifndef STORYTELLER_H
#define STORYTELLER_H

#include <vector>
#include <string>
#include <map>

#include "game/gamecomponent.h"
#include "game/storyteller/dialogue.h"
#include "graphics/display.h"
#include "graphics/2d/drawable2d.h"
#include "graphics/2d/image.h"
#include "util/textfile_reader.h"


typedef std::map<std::string, std::string> portrait_table_t;

/**
 * GameComponent that displays stories
 */
class StoryTeller : public GameComponent {
    friend class StoryFileReader;
public:
    StoryTeller();
    ~StoryTeller();
    virtual std::string getName(void) {
	return std::string("Story: ") + filename;
    };
    void setFilename(const std::string& f) { filename = f; };
protected:
    virtual void _load(void);
    virtual void _play(Uint32 msecs, Input* input, float alpha);
private:
    void setImage(std::string& filename);
    void setPortrait(std::string& actor, std::string& texture);
    void addDialogue(strings_t& wordlist);
    Image* image;
    Quad* text_background;
    Uint32 time_displayed;
    Uint32 msec_initial;
    Uint32 msec_per_word;
    float dialogue_v_ratio;
    std::string dir;
    std::string filename;
    std::vector< Dialogue* > dialogue_list;
    std::vector< Dialogue* >::iterator dialogue;
    portrait_table_t portrait;
};


class StoryFileReader : public TextFileReader {
public:
    StoryFileReader(const std::string f, StoryTeller* s);
private:
    virtual void handle_line(std::string& line);
    StoryTeller* st;
};


#endif // STORYTELLER_H

