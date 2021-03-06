import {
  startsWithHttp,
  wildlinkCopiedNotification,
  getSupportedDomain,
} from './helpers';

export default class ClipboardMonitor {
  /**
   * @param {number} interval - Interval in ms to check the clipboard.
   * @param {boolean} silent - Whether or not the clipboard should be automatically replaced.
   */
  constructor(wildlinkClient, interval = 600, silent = false) {
    this.wildlinkClient = wildlinkClient;
    this.interval = interval;
    this.silent = silent;
    // create textarea elements used to monitor and modify the clipboard
    this.pasteArea = document.createElement('textarea');
    this.copyArea = document.createElement('textarea');
    this.testArea = document.createElement('textarea');
    // we only care about testing the beginning of the clipboard
    // watching a large body of text is expensive
    this.testArea.maxLength = 100;
  }

  async watch() {
    console.log('starting clipboard monitor...');

    // append the textarea elements so we can interact with them
    document.body.appendChild(this.testArea);
    document.body.appendChild(this.pasteArea);
    document.body.appendChild(this.copyArea);

    // save the interval ID so we can cancel if needed
    // every 600 ms (default) we will run this function
    this.monitorIntervalId = setInterval(async () => {
      // watch the clipboard by:
      // 1. storing the old value
      // 2. pasting the new value
      // 3. compare the old and new values
      const oldTestClipboard = this.testArea.value;
      this.testArea.value = '';
      this.testArea.focus();
      document.execCommand('paste');
      const newTestClipboard = this.testArea.value;
      // starts with http, clipboard has changed, and not a vanity
      if (
        startsWithHttp(newTestClipboard) &&
        oldTestClipboard !== newTestClipboard &&
        // specific to the application's vanity link
        newTestClipboard.indexOf('wild.link') < 0
      ) {
        try {
          // let the browser handle caching
          const merchantDomains = await this.wildlinkClient.getDomains();
          const supportedDomain = getSupportedDomain(
            merchantDomains,
            newTestClipboard,
          );
          if (supportedDomain) {
            this.pasteArea.focus();
            this.pasteArea.value = '';
            document.execCommand('paste');
            const fullClipboard = this.pasteArea.value;
            console.group('supported domain copied:');
            console.log('request to generate vanity with URL:');
            console.log(fullClipboard);
            console.groupEnd();
            const { VanityURL } = await this.wildlinkClient.generateVanity(
              fullClipboard,
              supportedDomain,
            );
            if (!this.silent) {
              this.copyArea.value = VanityURL;
              this.copyArea.select();
              document.execCommand('copy');
              this.copyArea.value = '';
              // notify the user we have modified their clipboard
              wildlinkCopiedNotification(VanityURL);
            }
          }
        } catch (error) {
          console.log(error);
        }
      }
    }, this.interval);
  }

  stop() {
    clearInterval(this.monitorIntervalId);
    document.body.removeChild(this.testArea);
    document.body.removeChild(this.pasteArea);
    document.body.removeChild(this.copyArea);

    console.log('clipboard monitor stopped');
  }
}
