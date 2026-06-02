NAME = ffosapp-installer
CONTENTS = icon-56.png icon-112.png icon-128.png icon-512.png index.html install.js LICENSE.txt manifest.webapp style.css
ICONPRE = icon-
OMNISD_NAME = ffosapp-installer-omnisd

.PHONY: all
all: $(NAME).zip $(NAME).manifest.webapp github.manifest.webapp $(OMNISD_NAME).zip

.PHONY: clean
clean:
	find . -name '*~' -delete

.PHONY: icons
icons: $(ICONPRE)56.png $(ICONPRE)112.png $(ICONPRE)128.png $(ICONPRE)512.png

$(ICONPRE)56.png: icon.svg
	rsvg-convert -w 56 icon.svg -o $(ICONPRE)56.png

$(ICONPRE)112.png: icon.svg
	rsvg-convert -w 112 icon.svg -o $(ICONPRE)112.png

$(ICONPRE)128.png: icon.svg
	rsvg-convert -w 128 icon.svg -o $(ICONPRE)128.png

$(ICONPRE)512.png: icon.svg
	rsvg-convert -w 512 icon.svg -o $(ICONPRE)512.png

$(NAME).zip: clean icons $(CONTENTS)
	rm -f $(NAME).zip
	zip -r -9 $(NAME).zip $(CONTENTS)

$(OMNISD_NAME).zip: $(NAME).zip update.webapp metadata.json
	rm -f $(OMNISD_NAME).zip
	cp $(NAME).zip application.zip
	zip -9 $(OMNISD_NAME).zip application.zip update.webapp metadata.json
	rm application.zip

$(NAME).manifest.webapp: manifest.webapp $(NAME).zip
	@SIZE=$$(stat --format="%s" $(NAME).zip); \
	sed "s/\"launch_path\": \"[^\"]*\"/\"size\": $$SIZE, \"package_path\": \"http:\/\/localhost:8080\/$(NAME).zip\"/" manifest.webapp > $(NAME).manifest.webapp

github.manifest.webapp: manifest.webapp $(NAME).zip
	@SIZE=$$(stat --format="%s" $(NAME).zip); \
	sed "s/\"launch_path\": \"[^\"]*\"/\"size\": $$SIZE, \"package_path\": \"https:\/\/schnark.github.io\/$(NAME)\/$(NAME).zip\"/" manifest.webapp > github.manifest.webapp
