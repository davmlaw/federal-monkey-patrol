CC	= g++
ALLFLAGS = -Wall -O2
DEBUGFLAGS = -g -pg
ROOTDIR = ..
INCLUDE = $(ROOTDIR)
BUILD  = .#$(ROOTDIR)/objectfiles
CFLAGS	= -I$(INCLUDE) `xml2-config --cflags`
LIBS	= -lm 

OBJECTS	= clock.o fps_counter.o mtxlib.o \
	  settings.o string_util.o textfile_reader.o util.o \
	  xmlhelper.o

all:	$(OBJECTS)

clean:
	$(foreach obj, $(OBJECTS), rm -f $(BUILD)/$(obj) $(obj:.o=.d))

.cpp.o:
	$(CC) $(ALLFLAGS) $(DEBUGFLAGS) $(CFLAGS) -I$(INCLUDE) -c $*.cpp -o $(BUILD)/$@


%.d: %.cpp
	$(CC) -MM $(CFLAGS) $< > $@.$$$$; \
	sed 's,\($*\)\.o[ :]*,\1.o $@ : ,g' < $@.$$$$ > $@; \
	rm -f $@.$$$$

include $(OBJECTS:.o=.d)

