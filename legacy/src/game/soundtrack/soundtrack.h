// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sat Apr 16 18:15:15 2005
// Last modified: Sat Apr 16 18:15:15 2005

#ifndef SOUNDTRACK
#define SOUNDTRACK

#include "game/gamecomponent.h"

/**
 * Game Component that plays sound.
 */
class SoundTrack : public GameComponent {
public:
    SoundTrack();
    virtual ~SoundTrack();
    virtual std::string getName(void) {
	return std::string("SoundTrack: ") + filename;
    };
    void setFilename(std::string& f) { filename = f; };
protected:
    virtual void _load(void) { }; // nothing..
    virtual void _play(Uint32 msecs, Input* input, float alpha);
private:
    std::string filename;
};

#endif // SOUNDTRACK
